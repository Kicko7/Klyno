import { NewsItem } from '../components/NewsCard';

export const newsData: NewsItem[] = [
  {
    id: '1',
    title: 'Machu Picchu faces removal from Seven Wonders list',
    summary: 'Peru\'s iconic Machu Picchu is at risk of being removed from the New Seven Wonders list due to overtourism, local protests, and management failures. The UNESCO World Heritage site has seen visitor numbers surge beyond capacity, leading to environmental damage and conflicts with local communities.',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
    source: 'Travel Weekly',
    sourceIcon: 'https://logo.clearbit.com/travelweekly.com',
    category: 'Travel',
    readTime: '4 min read'
  },
  {
    id: '2',
    title: 'DeepSeek\'s AI model becomes first peer-reviewed LLM',
    summary: 'DeepSeek has achieved a historic milestone by becoming the first large language model to undergo rigorous peer review. The AI model demonstrated superior performance across multiple benchmarks while maintaining transparency in its training methodology.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    source: 'AI Research Journal',
    sourceIcon: 'https://logo.clearbit.com/arxiv.org',
    category: 'Technology',
    readTime: '6 min read'
  },
  {
    id: '3',
    title: 'Webb telescope may have detected first atmosphere on rocky exoplanet',
    summary: 'NASA\'s James Webb Space Telescope has potentially detected an atmosphere around a rocky exoplanet for the first time. The discovery could revolutionize our understanding of planetary formation and the potential for life beyond Earth.',
    image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    source: 'Space.com',
    sourceIcon: 'https://logo.clearbit.com/space.com',
    category: 'Science',
    readTime: '5 min read'
  },
  {
    id: '4',
    title: 'Nvidia spends over $900M to recruit Enfabrica CEO',
    summary: 'Nvidia has made a massive $900 million investment to recruit the CEO of Enfabrica, a networking chip startup. This strategic move aims to strengthen Nvidia\'s position in the data center networking market and accelerate AI infrastructure development.',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    source: 'TechCrunch',
    sourceIcon: 'https://logo.clearbit.com/techcrunch.com',
    category: 'Business',
    readTime: '3 min read'
  },
  {
    id: '5',
    title: 'Engineers achieve quantum entanglement across chip-scale distances',
    summary: 'Researchers have successfully achieved quantum entanglement between atomic nuclei separated by chip-scale distances using electrons as intermediaries. This breakthrough could pave the way for practical quantum computing applications and secure communication systems.',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    source: 'Nature Physics',
    sourceIcon: 'https://logo.clearbit.com/nature.com',
    category: 'Science',
    readTime: '7 min read'
  },
  {
    id: '6',
    title: 'Korean scientists develop breakthrough seawater hydrogen catalyst',
    summary: 'South Korean researchers have developed a revolutionary ruthenium nanocatalyst that can efficiently extract hydrogen from seawater. This breakthrough could make hydrogen fuel production more sustainable and cost-effective, potentially transforming the clean energy landscape.',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    source: 'Science Daily',
    sourceIcon: 'https://logo.clearbit.com/sciencedaily.com',
    category: 'Environment',
    readTime: '5 min read'
  },
  {
    id: '7',
    title: 'Breakthrough in fusion energy brings us closer to clean power',
    summary: 'Scientists at a major research facility have achieved a new milestone in fusion energy, producing more energy than consumed in the reaction. This advancement brings humanity closer to achieving practical fusion power, which could provide unlimited clean energy.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    source: 'Energy Today',
    sourceIcon: 'https://logo.clearbit.com/energy.gov',
    category: 'Energy',
    readTime: '6 min read'
  },
  {
    id: '8',
    title: 'New AI system can predict protein structures in seconds',
    summary: 'A revolutionary AI system has been developed that can predict protein structures in mere seconds, compared to traditional methods that take days or weeks. This breakthrough could accelerate drug discovery and advance our understanding of biological processes.',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    source: 'BioTech News',
    sourceIcon: 'https://logo.clearbit.com/biotech.com',
    category: 'Health',
    readTime: '4 min read'
  },
  {
    id: '9',
    title: 'SpaceX successfully launches next-generation satellite constellation',
    summary: 'SpaceX has successfully deployed its latest satellite constellation, expanding global internet coverage to remote areas. The mission represents another step toward providing high-speed internet access worldwide, particularly in underserved regions.',
    image: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=400&fit=crop',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: 'Space News',
    sourceIcon: 'https://logo.clearbit.com/spacex.com',
    category: 'Technology',
    readTime: '3 min read'
  }
];

export const featuredNews = newsData.slice(0, 3);
export const regularNews = newsData.slice(3);
