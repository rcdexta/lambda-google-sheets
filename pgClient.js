const { Client } = require('pg')

const pg = {
  init: async function() {
    const client = new Client({
      user: process.env['DB_USER'] || 'postgres',
      host: process.env['DB_HOST'] || 'localhost',
      database: process.env['DB_NAME'] || 'customers',
      password: process.env['DB_PASSWORD'] || '',
      port: 5432
    })

    await client.connect();
    return client;
  }
}

module.exports = pg
