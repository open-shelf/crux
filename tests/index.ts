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
    require('./verify_readers_and_stakes'); // Include the new test file
    require('./filter_books'); // Include the new test file
    require('./fetch_info');
});

after(() => {
  // This runs once after all tests
  console.log('Finished OpenShelf tests.');
});