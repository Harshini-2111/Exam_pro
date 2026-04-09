const { MongoClient } = require('mongodb');
require('dotenv').config();
const questionsData = require('./questions'); 

const client = new MongoClient(process.env.MONGO_URI);

async function seed() {
    try {
        await client.connect();
        const db = client.db("examDB");
        console.log("Connected to database...");

        await db.collection("questions").deleteMany({}); 

        const formattedQuestions = questionsData.map(q => ({
            ...q,
            level: q.level === "A" ? "levelA" : 
                   q.level === "B" ? "levelB" : 
                   q.level === "C" ? "levelC" : q.level
        }));
        
        await db.collection("questions").insertMany(formattedQuestions);
        
        console.log(` Success: Seeded ${formattedQuestions.length} questions!`);
        console.log(`Mapped levels to: levelA, levelB, levelC`);
    } catch (err) {
        console.error(" Error seeding database:", err);
    } finally {
        await client.close();
    }
}

seed();