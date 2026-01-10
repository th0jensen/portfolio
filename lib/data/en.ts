import type { Data } from './types.ts'

const data: Data = {
	about: {
		firstName: 'Thomas',
		lastName: 'Jensen',
		birthday: '10-12-2003',
		humanLanguages: ['English', 'Norwegian', 'German', 'Hebrew'],
		computerLanguages: ['Typescript', 'Go', 'Swift', 'Rust'],
	},
	tech: {
		languages: [
			'Typescript',
			'Javascript',
			'Go',
			'Swift',
			'HTML',
			'CSS',
			'Rust',
		],
		technologies: [
			'React.js',
			'TailwindCSS',
			'Express',
			'Node.js',
			'PostgreSQL',
			'Linux',
		],
	},
	experience: [
		{
			title: 'Joined Applesophy',
			date: 'Dec 2021',
			expanded: false,
			description:
				'Wrote articles primarily about Apple, alongside reviews of different tech gadgets.',
		},
		{
			title: 'Learning Swift',
			date: 'June 2022',
			expanded: false,
			description:
				'Started working on the Appleosophy iOS app, an immense undertaking; especially when considering that I knew nothing about either SwiftUI, Swift or Objective-C.',
		},
		{
			title: 'Appleosophy hits Testflight',
			date: 'Sep 2022',
			expanded: false,
			description:
				'The Appleosophy app was ready for beta testers after 3 months of learning and developing in SwiftUI.',
		},
		{
			title: 'Appleosophy 1.0 released',
			date: 'Dec 2022',
			expanded: false,
			description:
				'My first iOS app is launched on the App Store after 3 months of internal and external beta testing.',
		},
		{
			title: 'Joined Boolean UK',
			date: 'Apr 2024',
			expanded: false,
			description:
				'Started the intensive 6-month Full Stack Software Developer course at Boolean UK.',
		},
		// {
		// 	title: 'Started working on Tradio',
		// 	date: 'May 2024',
		// 	expanded: false,
		// 	description:
		// 		'Started  Tradio, a personalised trading platform developed together with Shreyash Gupta.',
		// },
		{
			title: 'Boolean UK Alumni',
			date: 'Oct 2024',
			expanded: false,
			description:
				'Graduated from the Full Stack Software Developer course at Boolean UK',
		},
	],
	projects: [
		// {
		// 	name: 'Tradio',
		// 	status: 'Under Construction',
		// 	imageURL: '/images/tradio.png',
		// 	technologies: {
		// 		'TypeScript': '#3178C6',
		// 		'SwiftUI': '#F05138',
		// 		'Deno': '#000000',
		// 		'Postgres': '#336791',
		// 	},
		// 	description:
		// 		'A personalised trading platform built for the future with AI and security in mind.',
		// },
		{
			name: 'zed-industries/zed contributions',
			imageURL: '/images/zed.webp',
			technologies: {
				'Rust': '#000000',
				'GPUI': '#3178C6',
				'JSON': '#ffffff',
			},
			description: `- PR #26211: Implement Extended Terminal Option
			- Gruber Darker Theme Extension
			`,
			source: {
				type: 'github',
				link: 'https://github.com/zed-industries/zed/pull/26211',
			},
		},
		{
			name: 'Appleosophy',
			imageURL: '/images/appleosophy.webp',
			technologies: {
				'Swift': '#F05138',
				'Objective-C': '#007AFF',
				'SwiftUI': '#F05138',
				'WordPress': '#21759B',
			},
			description:
				'The official iOS app for Applesophy, which I built and shipped as the sole developer in 6 months. I used the pre-existing WordPress REST API as a backend.',
			source: {
				type: 'appstore',
				link: 'https://apps.apple.com/us/app/appleosophy/id1635844078',
			},
		},
		// {
		// 	name: 'Flavorelle',
		// 	imageURL: '/images/flavorelle.png',
		// 	technologies: {
		// 		'Next.js': '#000000',
		// 		'TypeScript': '#3178C6',
		// 		'tRPC': '#2596BE', // Note: Not an official color
		// 		'Zod': '#00BFA5', // Note: Not an official color
		// 	},
		// 	description:
		// 		'A self-hostable recipe manager app, made with simplicity and fun in mind!',
		// 	source: {
		// 		type: 'github',
		// 		link: 'https://github.com/th0jensen/flavorelle',
		// 	},
		// },
	],
}

export default data
