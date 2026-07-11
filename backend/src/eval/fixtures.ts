export type SerializedMessage = {
  type: "human" | "ai";
  content: string;
};

export type ScopingExample = {
  id: string;
  messages: SerializedMessage[];
  criteria: string[];
};

export const conversation1: SerializedMessage[] = [
  {
    type: "human",
    content: "What's the best way to invest $50,000 for retirement?",
  },
  {
    type: "ai",
    content:
      "Could you please provide some additional information to tailor the investment advice for your $50,000 retirement goal? Specifically:\n Your current age or desired retirement age\n Your risk tolerance (low, medium, high)\n Any preferences for investment types (e.g., stocks, bonds, mutual funds, real estate)\n Whether you are investing through a tax-advantaged account (e.g., IRA, 401(k)) or a regular brokerage account\n This will help me provide more personalized and relevant suggestions.",
  },
  {
    type: "human",
    content:
      "I'm 25 and I want to retire by 45. My risk tolerance is high right now but I think will decrease over time. I have heard that stocks and ETFs are a good choice, but I'm open to anything. And I already have a 401k, but this would just be through a regular brokerage account.",
  },
];

export const conversation2: SerializedMessage[] = [
  {
    type: "human",
    content: "I am looking for an apartment in NYC, can you help me?",
  },
  {
    type: "ai",
    content:
      "Could you please specify your apartment preferences? For example:\n Desired neighborhoods or boroughs\n Number of bedrooms/bathrooms\n Budget range (monthly rent)\n Any amenities or must-have features\n Preferred move-in date\n This information will help me provide the most relevant apartment options in NYC.",
  },
  {
    type: "human",
    content:
      "I'd prefer to live in Chelsea, Flatiron, or West Village. I'm looking for a 2 bed 2 bath, and I am looking for monthly rent below 7k. I'd like this to be a doorman building and have an in unit washer and dryer, but it's okay if there's no washer dryer. It's a plus if the building has a gym. And I'd like to move in in September 2025.",
  },
];

export const conversation3: SerializedMessage[] = [
  {
    type: "human",
    content: "Help me compare CRM platforms for my company.",
  },
  {
    type: "ai",
    content:
      "Happy to help compare CRM platforms. Could you share:\n Company size / number of sales users\n Industry or use case (B2B, B2C, support-heavy, etc.)\n Must-have integrations\n Budget range (annual)\n Any platforms you already use or are considering\n This will let me narrow the comparison.",
  },
  {
    type: "human",
    content:
      "We're a 40-person B2B SaaS company with about 12 sales reps. We need Salesforce or HubSpot-level pipeline tracking, must integrate with Gmail and Slack, and prefer under $25k/year. We're currently on spreadsheets and evaluating HubSpot and Pipedrive. Decision needed for Q3 2026.",
  },
];

export const conversation4: SerializedMessage[] = [
  {
    type: "human",
    content: "I want to plan a trip to Japan.",
  },
  {
    type: "ai",
    content:
      "I can help plan a Japan trip. Please share:\n Travel dates or season\n Trip length\n Cities or regions of interest\n Budget (flights excluded or included?)\n Travel style (food, culture, nature, nightlife)\n Any constraints (dietary, mobility, traveling with kids)\n That will help me build a focused research brief.",
  },
  {
    type: "human",
    content:
      "Two weeks in mid-April 2027 for cherry blossom season. Focus on Tokyo and Kyoto only. Budget about $4,000 per person excluding international flights. Interested in food and temples, not nightlife. Vegetarian-friendly options matter. Solo traveler, no kids.",
  },
];

export const conversation5: SerializedMessage[] = [
  {
    type: "human",
    content: "What should I know about adopting Kubernetes at our company?",
  },
  {
    type: "ai",
    content:
      "To scope Kubernetes adoption research, could you clarify:\n Current infrastructure (VMs, PaaS, cloud provider)\n Team size and existing container experience\n Workloads you want to migrate first\n Compliance or multi-region requirements\n Timeline and success metrics\n Any managed offerings already under consideration?",
  },
  {
    type: "human",
    content:
      "We're on AWS EC2 today with a 6-person platform team that has some Docker experience but no production k8s. First target is our Node.js APIs (about 15 services). Need SOC2-friendly setup, single region (us-east-1) is fine for now. Looking at EKS vs ECS Fargate over the next 6 months. Success = fewer deploy incidents and faster rollbacks.",
  },
];

export const criteria1 = [
  "Current age is 25",
  "Desired retirement age is 45",
  "Current risk tolerance is high",
  "Interested in investing in stocks and ETFs",
  "Open to forms of investment beyond stocks and ETFs",
  "Investment account is a regular brokerage account",
];

export const criteria2 = [
  "Looking for a 2 bed 2 bath apartment in Chelsea, Flatiron, or West Village",
  "Monthly rent below 7k",
  "Should be in a doorman building",
  "Ideally have an in unit washer and dryer but not strict",
  "Ideally have a gym but not strict",
  "Move in date is September 2025",
];

export const criteria3 = [
  "Company is a 40-person B2B SaaS business",
  "About 12 sales reps will use the CRM",
  "Need pipeline tracking comparable to Salesforce or HubSpot",
  "Must integrate with Gmail and Slack",
  "Prefer annual budget under $25k",
  "Currently evaluating HubSpot and Pipedrive",
  "Decision needed for Q3 2026",
];

export const criteria4 = [
  "Trip length is two weeks",
  "Travel timing is mid-April 2027 for cherry blossom season",
  "Destinations limited to Tokyo and Kyoto",
  "Budget about $4,000 per person excluding international flights",
  "Interests are food and temples, not nightlife",
  "Vegetarian-friendly options are important",
  "Solo traveler with no children",
];

export const criteria5 = [
  "Current infrastructure is AWS EC2",
  "Platform team has 6 people with Docker experience but no production Kubernetes",
  "First migration target is about 15 Node.js API services",
  "Setup should be SOC2-friendly",
  "Single region us-east-1 is acceptable",
  "Comparing EKS vs ECS Fargate over the next 6 months",
  "Success metrics are fewer deploy incidents and faster rollbacks",
];

/** Canonical examples for the deep_research_scoping dataset. */
export const scopingExamples: ScopingExample[] = [
  {
    id: "retirement-investing",
    messages: conversation1,
    criteria: criteria1,
  },
  {
    id: "nyc-apartment",
    messages: conversation2,
    criteria: criteria2,
  },
  {
    id: "crm-comparison",
    messages: conversation3,
    criteria: criteria3,
  },
  {
    id: "japan-trip",
    messages: conversation4,
    criteria: criteria4,
  },
  {
    id: "kubernetes-adoption",
    messages: conversation5,
    criteria: criteria5,
  },
];

export const DATASET_NAME = "deep_research_scoping";

export const DATASET_DESCRIPTION =
  "A dataset that measures the quality of research briefs generated from an input conversation";
