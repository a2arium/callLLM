
export enum Topic {
    General = "general",
    Animal = "animal",
    Space = "space"
}

export type FunctionParams = {
    // The topic to get a fact about.
    topic: Topic;
    // The mood to get a fact in. 
    mood?: 'funny' | 'serious' | 'inspiring' | 'educational' | 'historical' | 'scientific' | 'cultural' | 'general';
}

// Get a random fact about a topic
export function toolFunction(params: FunctionParams): { fact: string; source?: string } {
    console.log(`getFact tool called with topic: ${params.topic} and mood: ${params.mood}`);

    // List of random facts
    const generalFacts = [
        { fact: "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat.", source: "National Geographic" },
        { fact: "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once on its axis, but only 225 Earth days to go around the Sun.", source: "NASA" },
        { fact: "The shortest war in history was between Britain and Zanzibar on August 27, 1896. Zanzibar surrendered after 38 minutes.", source: "Guinness World Records" },
        { fact: "The average person will spend six months of their life waiting for red lights to turn green.", source: "National Highway Traffic Safety Administration" },
        { fact: "The Great Barrier Reef is the largest living structure on Earth. It can be seen from outer space.", source: "UNESCO" }
    ];

    const animalFacts = [
        { fact: "Octopuses have three hearts, nine brains, and blue blood.", source: "Smithsonian Magazine" },
        { fact: "Cows have best friends and get stressed when they're separated.", source: "University of Northampton study" },
        { fact: "A group of flamingos is called a 'flamboyance'.", source: "Oxford English Dictionary" },
        { fact: "Koalas sleep for up to 22 hours a day.", source: "Australian Koala Foundation" },
        { fact: "Dolphins have names for each other and can call each other by specific whistles.", source: "Marine Mammal Science Journal" }
    ];

    const spaceFacts = [
        { fact: "There are more stars in the universe than grains of sand on all the beaches on Earth.", source: "NASA" },
        { fact: "One million Earths could fit inside the Sun.", source: "NASA Solar System Exploration" },
        { fact: "The footprints on the Moon will last for at least 100 million years because there's no wind or water to erode them.", source: "Apollo Mission Reports" },
        { fact: "A neutron star is so dense that a teaspoon would weigh about 10 million tons.", source: "European Space Agency" },
        { fact: "The largest known star, UY Scuti, is approximately 1,700 times the radius of the Sun.", source: "American Astronomical Society" }
    ];

    let factList = generalFacts;

    // Select the appropriate fact list based on the topic
    // const normalizedTopic = params.topic.toLowerCase(); // No longer needed
    switch (params.topic) {
        case Topic.Animal:
            factList = animalFacts;
            break;
        case Topic.Space:
            factList = spaceFacts;
            break;
        case Topic.General:
        default:
            factList = generalFacts;
            // Optional: Log if the enum value wasn't explicitly handled, though TS should catch invalid values
            if (params.topic !== Topic.General) {
                console.log(`Topic '${params.topic}' defaulted to general facts`);
            }
            break;
    }

    // Select a random fact from the chosen list
    const randomIndex = Math.floor(Math.random() * factList.length);
    return factList[randomIndex];
} 