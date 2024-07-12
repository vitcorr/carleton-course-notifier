const { Pool } = require('pg');
require("dotenv").config();


const pool = new Pool({
    connectionString: 'postgresql://carleton_course_notifier_render_user:MptxTAxZYn9gEPNHPb1NiQNdLrS46ljc@dpg-cq7ktclds78s73d8qbl0-a/carleton_course_notifier_render',
    //ssl: true
})

module.exports = pool