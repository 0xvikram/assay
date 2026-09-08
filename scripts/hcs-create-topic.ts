import { createTopic } from "../src/hcs";

const id = await createTopic();
console.log(`\n  HCS topic created: ${id}`);
console.log(`  https://hashscan.io/testnet/topic/${id}`);
console.log(`\n  Add to .env:  HCS_TOPIC_ID=${id}\n`);
