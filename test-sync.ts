import { syncEmails } from './src/lib/email-sync';
import * as dotenv from 'dotenv';
dotenv.config();
syncEmails().then(console.log).catch(console.error);
