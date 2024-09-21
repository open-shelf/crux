import { describe, before, after } from 'mocha';

before(() => {
  // This runs once before all tests
  console.log('Starting OpenShelf tests...');
});

describe('OpenShelf Tests', () => {
    require('./add_book');
    require('./add_chapter');
    require('./purchase_chapter');
    require('./purchase_full_book');
    require('./stake_on_book');
});

after(() => {
  // This runs once after all tests
  console.log('Finished OpenShelf tests.');
});