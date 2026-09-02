use crate::types::{
    Data as PortfolioData, Head, OpenGraph, OpenGraphImage, StructuredData,
};

/// Public origin used for canonical URLs and social previews. Canonical links
/// must always point at production, so this stays fixed unless `SITE_ORIGIN`
/// overrides it (preview deployments).
pub(super) const DEFAULT_SITE_ORIGIN: &str = "https://thojensen.com";
const SITE_NAME: &str = "Thomas Jensen";
const OG_LOCALE: &str = "en_US";
// PNG first: some crawlers only ever look at the first `og:image` tag, and
// PNG decodes everywhere, whereas WebP support is broad but not universal.
// WebP second is a smaller-and-just-as-sharp upgrade for crawlers that do
// support it.
const OG_IMAGE_PATH_PNG: &str = "/static/images/og-card.png";
const OG_IMAGE_MIME_PNG: &str = "image/png";
const OG_IMAGE_PATH_WEBP: &str = "/static/images/og-card.webp";
const OG_IMAGE_MIME_WEBP: &str = "image/webp";
const OG_IMAGE_ALT: &str = "Thomas Jensen — systems engineer";
const OG_IMAGE_WIDTH: u32 = 1200;
const OG_IMAGE_HEIGHT: u32 = 630;

fn og_image(site_origin: &str, path: &str, mime: &str) -> OpenGraphImage {
    OpenGraphImage {
        url: format!("{}{path}", site_origin.trim_end_matches('/')),
        alt: OG_IMAGE_ALT.to_owned(),
        mime: mime.to_owned(),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
    }
}

#[derive(Clone, Copy, Debug)]
pub(super) struct RouteSeo {
    pub(super) title: &'static str,
    pub(super) description: &'static str,
    og_type: &'static str,
    structured_data: StructuredData,
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub enum RenderRoute {
    Home,
    Projects,
    /// A single project's detail page, keyed by `Project::slug`.
    Project(String),
    Experience,
    Contact,
    Automata,
}

impl RenderRoute {
    pub fn from_path(path: &str) -> Option<Self> {
        match path {
            "/" => Some(Self::Home),
            "/projects" => Some(Self::Projects),
            "/experience" => Some(Self::Experience),
            "/contact" => Some(Self::Contact),
            "/automata" => Some(Self::Automata),
            _ => {
                let slug = path.strip_prefix("/projects/")?;
                (!slug.is_empty() && !slug.contains('/'))
                    .then(|| Self::Project(slug.to_owned()))
            }
        }
    }

    pub fn path(&self) -> String {
        match self {
            Self::Home => "/".to_owned(),
            Self::Projects => "/projects".to_owned(),
            Self::Project(slug) => format!("/projects/{slug}"),
            Self::Experience => "/experience".to_owned(),
            Self::Contact => "/contact".to_owned(),
            Self::Automata => "/automata".to_owned(),
        }
    }

    pub(super) const fn seo(&self) -> RouteSeo {
        match self {
            Self::Home => RouteSeo {
                title: "Thomas Jensen",
                description: "Software engineer working in Rust — systems tools, native apps, and open-source contributions.",
                og_type: "profile",
                structured_data: StructuredData::Person,
            },
            Self::Projects => RouteSeo {
                title: "Projects — Thomas Jensen",
                description: "A collection of things I've built: native apps, systems tools, and open-source contributions.",
                og_type: "website",
                structured_data: StructuredData::None,
            },
            Self::Project(_) => RouteSeo {
                title: "Project — Thomas Jensen",
                description: "Details on a project by Thomas Jensen.",
                og_type: "article",
                structured_data: StructuredData::None,
            },
            Self::Experience => RouteSeo {
                title: "Experience — Thomas Jensen",
                description: "Open-source contributions and things I've shipped — Zed extensions, GPUI features, and a few tools of my own.",
                og_type: "website",
                structured_data: StructuredData::None,
            },
            Self::Contact => RouteSeo {
                title: "Contact — Thomas Jensen",
                description: "Get in touch about Rust development, systems work, or potential collaboration.",
                og_type: "website",
                structured_data: StructuredData::None,
            },
            Self::Automata => RouteSeo {
                title: "Cellular Automata — Thomas Jensen",
                description: "An interactive cellular automaton engine, written in Haskell and compiled to WebAssembly.",
                og_type: "website",
                structured_data: StructuredData::None,
            },
        }
    }

    /// Canonical URLs always point at the public origin, never at the host the
    /// request happened to arrive on, so proxies and preview hosts cannot
    /// split a page's ranking across duplicate URLs.
    pub fn canonical(&self, site_origin: &str) -> String {
        format!("{}{}", site_origin.trim_end_matches('/'), self.path())
    }

    /// Looks up the title and description for a `Project(slug)` route from
    /// the live project data, so subpage `<title>`s stay in sync with
    /// `data.json` instead of duplicating project copy in Rust.
    fn project_seo(&self, data: &PortfolioData) -> Option<(String, String)> {
        let Self::Project(slug) = self else {
            return None;
        };
        let project =
            data.projects.iter().find(|project| &project.slug == slug)?;

        Some((
            format!("{} — Thomas Jensen", project.name),
            project.description.clone(),
        ))
    }

    pub fn head(&self, site_origin: &str, data: &PortfolioData) -> Head {
        let seo = self.seo();
        let (title, description) =
            self.project_seo(data).unwrap_or_else(|| {
                (seo.title.to_owned(), seo.description.to_owned())
            });

        Head {
            title,
            description,
            canonical: self.canonical(site_origin),
            robots: "index, follow".to_owned(),
            og: OpenGraph {
                og_type: seo.og_type.to_owned(),
                site_name: SITE_NAME.to_owned(),
                locale: OG_LOCALE.to_owned(),
                images: vec![
                    og_image(site_origin, OG_IMAGE_PATH_PNG, OG_IMAGE_MIME_PNG),
                    og_image(
                        site_origin,
                        OG_IMAGE_PATH_WEBP,
                        OG_IMAGE_MIME_WEBP,
                    ),
                ],
            },
            structured_data: seo.structured_data,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_path_maps_known_routes_and_rejects_unknown() {
        assert_eq!(RenderRoute::from_path("/"), Some(RenderRoute::Home));
        assert_eq!(
            RenderRoute::from_path("/projects"),
            Some(RenderRoute::Projects)
        );
        assert_eq!(
            RenderRoute::from_path("/experience"),
            Some(RenderRoute::Experience)
        );
        assert_eq!(
            RenderRoute::from_path("/contact"),
            Some(RenderRoute::Contact)
        );
        assert_eq!(
            RenderRoute::from_path("/automata"),
            Some(RenderRoute::Automata)
        );
        assert_eq!(RenderRoute::from_path("/nope"), None);
    }

    #[test]
    fn from_path_parses_project_slugs_and_rejects_malformed_ones() {
        assert_eq!(
            RenderRoute::from_path("/projects/crabdash"),
            Some(RenderRoute::Project("crabdash".to_owned()))
        );
        assert_eq!(RenderRoute::from_path("/projects/"), None);
        assert_eq!(RenderRoute::from_path("/projects/crabdash/extra"), None);
    }

    #[test]
    fn head_builds_canonical_and_og_image_urls_without_double_slashes() {
        let fixture_data = PortfolioData::get();
        let head =
            RenderRoute::Contact.head("https://example.com/", &fixture_data);

        assert_eq!(head.canonical, "https://example.com/contact");
        assert_eq!(
            head.og
                .images
                .iter()
                .map(|i| i.url.as_str())
                .collect::<Vec<_>>(),
            vec![
                "https://example.com/static/images/og-card.png",
                "https://example.com/static/images/og-card.webp",
            ]
        );
        assert_eq!(head.title, "Contact — Thomas Jensen");
        assert!(!head.description.is_empty());
    }

    #[test]
    fn home_seo_is_defined_in_rust_and_uses_person_structured_data() {
        let fixture_data = PortfolioData::get();
        let head = RenderRoute::Home.head("https://example.com", &fixture_data);

        assert_eq!(head.title, "Thomas Jensen");
        assert!(!head.description.is_empty());
        assert!(matches!(head.structured_data, StructuredData::Person));
        assert!(matches!(
            RenderRoute::Contact.seo().structured_data,
            StructuredData::None
        ));
    }

    #[test]
    fn head_uses_the_matching_projects_name_and_description() {
        let fixture_data = PortfolioData::get();
        let project = fixture_data
            .projects
            .iter()
            .find(|project| project.slug == "crabdash")
            .expect("fixture data.json should contain the crabdash project");
        let route = RenderRoute::Project("crabdash".to_owned());

        let head = route.head("https://example.com", &fixture_data);

        assert_eq!(head.canonical, "https://example.com/projects/crabdash");
        assert!(head.title.contains(&project.name));
        assert!(head.description.starts_with(&project.description));
    }

    #[test]
    fn head_falls_back_to_generic_project_seo_for_an_unknown_slug() {
        let fixture_data = PortfolioData::get();
        let route = RenderRoute::Project("does-not-exist".to_owned());

        let head = route.head("https://example.com", &fixture_data);

        assert_eq!(head.title, route.seo().title);
        assert_eq!(head.description, route.seo().description);
    }

    /// The sitemap is hand-maintained, so it drifts the moment a project is
    /// added to data.json or a route is added here — which has happened before.
    #[test]
    fn the_sitemap_lists_every_renderable_route_exactly_once() {
        const SITEMAP: &str = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/static/sitemap.xml"
        ));

        let data = PortfolioData::get();
        let mut expected = vec![
            RenderRoute::Home,
            RenderRoute::Projects,
            RenderRoute::Experience,
            RenderRoute::Contact,
            RenderRoute::Automata,
        ];
        expected.extend(
            data.projects
                .iter()
                .map(|project| RenderRoute::Project(project.slug.clone())),
        );

        for route in &expected {
            let loc =
                format!("<loc>{}</loc>", route.canonical(DEFAULT_SITE_ORIGIN));
            assert_eq!(
                SITEMAP.matches(&loc).count(),
                1,
                "sitemap should list {} exactly once",
                route.path()
            );
        }

        assert_eq!(
            SITEMAP.matches("<loc>").count(),
            expected.len(),
            "sitemap lists URLs that are not renderable routes"
        );
    }
}
