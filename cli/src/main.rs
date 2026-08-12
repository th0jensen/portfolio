use anyhow::Result;

use crate::{
    command::{Args, Command, CommandSpec},
    s3::S3,
};

mod command;
mod s3;

static COMMANDS: &[CommandSpec] = &[
    command_spec!(Upload, "/upload", ["<name>", "<path>"]),
    command_spec!(Reencode, "/reencode", ["<name>"]),
    command_spec!(Delete, "/delete", ["<name>"]),
    command_spec!(Verify, "/verify", ["<name>"]),
    command_spec!(List, "/list"),
    command_spec!(Help, "/help"),
    command_spec!(Quit, "/quit"),
    command_spec!(None, ""),
];

#[tokio::main]
async fn main() -> Result<()> {
    let s3 = S3::new().await;
    println!("\nSuccesfully connected to S3 storage! ✨");
    println!("What would you like to do today?\n");
    loop {
        let cmd = Command::prompt();
        let result = match cmd {
            Ok(cmd) => match cmd {
                Command::Upload { args } => s3.upload(args).await,
                Command::Reencode { args } => s3.reencode(args).await,
                Command::Delete { args } => s3.delete(args).await,
                Command::Verify { args } => s3.verify(args).await,
                Command::List => s3.list().await,
                Command::Help => {
                    cmd.help(None);
                    continue;
                }
                Command::Quit => std::process::exit(0),
                Command::None => {
                    cmd.help(None);
                    continue;
                }
            },
            Err((cmd, idx)) => {
                cmd.help(Some(idx));
                continue;
            }
        };

        if let Err(err) = result {
            eprintln!("Error Occurred: {}", err);
            continue;
        }
    }
}
