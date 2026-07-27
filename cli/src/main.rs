use anyhow::Result;

use crate::{
    command::{Args, Command, CommandSpec},
    s3::S3,
};

mod command;
mod s3;

static COMMANDS: &[CommandSpec] = &[
    command_spec!(UPLOAD, "/upload", ["<name>", "<path>"]),
    command_spec!(VERIFY, "/verify", ["<name>"]),
    command_spec!(LIST, "/list"),
    command_spec!(HELP, "/help"),
    command_spec!(QUIT, "/quit"),
    command_spec!(NONE, ""),
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
                Command::UPLOAD { args } => s3.upload(args).await,
                Command::VERIFY { args } => s3.verify(args).await,
                Command::LIST => s3.list().await,
                Command::HELP => Ok(cmd.help(None)),
                Command::QUIT => std::process::exit(0),
                Command::NONE => Ok(cmd.help(None)),
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
