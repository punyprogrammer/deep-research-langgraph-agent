export type SerializedMessage = {
  type: "human" | "ai";
  content: string;
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

export const DATASET_NAME = "deep_research_scoping";

export const DATASET_DESCRIPTION =
  "A dataset that measures the quality of research briefs generated from an input conversation";
