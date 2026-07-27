use std::io::Write;
use std::path::{Path, PathBuf};
use std::{iter::once, ops::Range};

use anyhow::Result;

use crate::COMMANDS;

const RED: &str = "\x1b[38;2;255;50;50m";
const YELLOW: &str = "\x1b[38;2;255;221;51m";
const RESET: &str = "\x1b[0m";
const PROMPT: &str = "א";

pub struct CommandSpec {
    pub name: &'static str,
    pub parameters: &'static [&'static str],
    pub build: fn(Vec<String>) -> Command,
    pub matches: fn(&Command) -> bool,
    pub arg_count: fn(&Command) -> usize,
}

impl CommandSpec {
    fn command(&self, arguments: Vec<String>) -> Command {
        (self.build)(arguments)
    }
}

#[macro_export]
macro_rules! command_spec {
    ($variant:ident, $name:literal, [$($parameter:literal),+]) => {
        CommandSpec {
            name: $name,
            parameters: &[$($parameter),+],
            build: |values| Command::$variant {
                args: Args(values),
            },
            matches: |command| {
                matches!(command, Command::$variant { .. })
            },
            arg_count: |command| match command {
                Command::$variant { args } => args.0.len(),
                _ => unreachable!("spec used with the wrong command"),
            },
        }
    };

    ($variant:ident, $name:literal) => {
        CommandSpec {
            name: $name,
            parameters: &[],
            build: |_| Command::$variant,
            matches: |command| {
                matches!(command, Command::$variant)
            },
            arg_count: |_| 0
        }
    };
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Args(pub Vec<String>);

#[derive(Clone, Debug, Default, PartialEq)]
pub enum Command {
    UPLOAD {
        args: Args,
    },
    VERIFY {
        args: Args,
    },
    LIST,
    HELP,
    QUIT,
    #[default]
    NONE,
}

impl Command {
    pub fn from(input: String) -> Option<Self> {
        let mut words = input.split_whitespace();
        let name = words.next()?;

        let spec = COMMANDS.iter().find(|spec| spec.name == name)?;

        let arguments = words.map(str::to_owned).collect();
        Some(spec.command(arguments))
    }

    fn spec(&self) -> &'static CommandSpec {
        COMMANDS
            .iter()
            .find(|spec| (spec.matches)(self))
            .expect("every Command must have a CommandSpec")
    }

    pub fn verify_args(self) -> Result<Command, (Command, Range<usize>)> {
        let spec = self.spec();
        let (supplied, required) = ((spec.arg_count)(&self), spec.parameters.len());

        if supplied < required {
            let missing_idx = (supplied + 1)..(required + 1);
            return Err((self, missing_idx));
        }

        Ok(self)
    }

    pub fn help(self, range: Option<Range<usize>>) {
        if self == Self::default() {
            println!("\n    Use /help for a list of available commands\n");
            return ();
        }
        Self::print_missing(&self, range);

        println!("\n    Available commands are: ");
        COMMANDS.iter().for_each(|cmd| {
            print!("      {}", cmd.name);
            cmd.parameters.iter().for_each(|x| print!(" {x}"));
            println!();
        });
    }

    fn print_missing(&self, range: Option<Range<usize>>) {
        if let Some(idx) = range {
            let spec = self.spec();
            print!("\n    You forgot: ");
            for (i, part) in once(spec.name)
                .chain(spec.parameters.iter().copied())
                .enumerate()
            {
                if idx.contains(&(i)) {
                    print!("{RED}{part}{RESET} ");
                    continue;
                }
                print!("{part} ",)
            }
            println!()
        }
    }

    pub fn prompt() -> Result<Self, (Self, Range<usize>)> {
        Self::print_prompt();

        let input = Self::read_line(&mut String::new());
        match Self::from(input) {
            Some(cmd) => match cmd.verify_args() {
                Ok(cmd) => Ok(cmd),
                Err((cmd, idx)) => Err((cmd, idx)),
            },
            None => Err((Self::default(), Range::default())),
        }
    }

    fn read_line(buf: &mut String) -> String {
        std::io::stdin()
            .read_line(buf)
            .expect("unexpected io error");
        buf.to_string()
    }

    fn print_prompt() {
        let cwd = Self::get_relative_cwd();
        let prompt = format!("{cwd} {YELLOW}{PROMPT}{RESET}");
        print!("{}> ", prompt);
        std::io::stdout().flush().expect("failed to flush stdout");
    }

    fn get_relative_cwd() -> String {
        let cwd = std::env::current_dir().expect("unexpected env error");

        if let Some(home) = std::env::var_os("HOME")
            .or_else(|| std::env::var_os("USERPROFILE"))
            .map(PathBuf::from)
        {
            if cwd.starts_with(&home) {
                if let Ok(rel_path) = cwd.strip_prefix(&home) {
                    if rel_path == Path::new("") {
                        return "~".to_string();
                    }
                    return format!("~/{}", rel_path.display());
                }
            }
        }

        cwd.display().to_string()
    }
}
