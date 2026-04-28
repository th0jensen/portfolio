//! # Lastfm
//!
//! Copies the needed Lastfm structs from the Lastfm crate
//! for export to Typescript frontend.
//!
//! Note that some fields are stripped for a lean API.

use serde::Serialize;

#[allow(dead_code)]
/// A Last.fm track that is currently playing.
#[derive(ts_rs::TS, Serialize, Debug, Clone, PartialEq, Eq, Hash)]
#[ts(export)]
pub struct NowPlayingTrack {
    pub artist: String,
    pub name: String,
    pub image: Option<String>,
    pub album: String,
    pub url: String,
}

impl From<lastfm::track::NowPlayingTrack> for NowPlayingTrack {
    fn from(t: lastfm::track::NowPlayingTrack) -> Self {
        Self {
            artist: t.artist.name,
            name: t.name,
            image: t.image.medium,
            album: t.album,
            url: t.url,
        }
    }
}
