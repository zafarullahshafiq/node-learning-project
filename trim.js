
const express = require('express');
const pool = require('./db');       
const app = express();
const bcrypt = require('bcrypt');

app.use(express.json());



app.get('/', (req, res) =>{
    res.send('Trim. api running');
});





app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






app.post('/register/customer', async (req, res) => {
  try {
    const { customer_name, phone, email, password, profile_picture } = req.body;

    if (!customer_name || !phone || !email || !password) {
      return res.status(400).json({ error: 'name, phone, email, password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO customers (customer_name, phone, email, password, profile_picture)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_name, phone, email, hashedPassword, profile_picture || null]
    );

    res.status(201).json({
      message: 'Customer registered',
      customer: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/customers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT customer_id, customer_name, phone, email, profile_picture
       FROM customers
       ORDER BY customer_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT customer_id, customer_name, phone, email, profile_picture
       FROM customers
       WHERE customer_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.post('/register/barber', async (req, res) => {
  try {
    const { barber_name, barber_email, password, phone, shop_name, shop_address, description, logo, experience, profile_picture } = req.body;

    if (!barber_name || !barber_email || !password || !phone || !shop_name || !shop_address || !description || !experience) {
      return res.status(400).json({ error: 'barber_name, barber_email, password, phone, shop_name, shop_address, description, experience required' });
    }

    
    const shopResult = await pool.query(
      `INSERT INTO shop (shop_name, shop_address, description, logo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [shop_name, shop_address, description || null, logo || null]
    );

    const shop = shopResult.rows[0];

    const hashedpassword = await bcrypt.hash(password,10);
    const barberResult = await pool.query(
      `INSERT INTO barber (shop_id, barber_name, barber_email, password, phone, experience, profile_picture)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [shop.shop_id, barber_name, barber_email, hashedpassword, phone, experience || 0, profile_picture || null]
    );

    res.status(201).json({
      message: 'Barber registered',
      shop,
      barber: barberResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.get('/barbers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.barber_id, b.barber_name, b.barber_email, b.phone, b.experience, b.profile_picture,
              s.shop_id, s.shop_name, s.shop_address, s.description
       FROM barber b
       JOIN shop s ON b.shop_id = s.shop_id
       ORDER BY b.barber_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/barbers/available', async (req, res) => {
  try { 
    const { date, start_time, end_time } = req.query;
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'date, start_time, end_time required' });
    }

    const dayResult = await pool.query(
      `SELECT UPPER(TO_CHAR($1::date, 'FMDay')) AS day`,
      [date]
    );
    const day = dayResult.rows[0].day;

    const result = await pool.query(
      `SELECT b.barber_id, b.barber_name, b.phone, s.shop_name, s.shop_address
       FROM barber b
       JOIN shop s ON b.shop_id = s.shop_id
       JOIN availability a ON a.barber_id = b.barber_id
       WHERE a.day = $1
         AND a.active_status = 'online'
         AND a.start_time <= $2::time
         AND a.end_time >= $3::time
         AND NOT EXISTS (
           SELECT 1
           FROM appointment ap
           WHERE ap.barber_id = b.barber_id
             AND ap.start_time < ($4::date + $3::time)
             AND ap.end_time > ($4::date + $2::time)
             AND ap.status IN ('pending','confirmed')
         )`,
      [day, start_time, end_time, date]
    );

    res.json({ available_barbers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/barbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.barber_id, b.barber_name, b.barber_email, b.phone, b.experience, b.profile_picture,
              s.shop_id, s.shop_name, s.shop_address, s.description
       FROM barber b
       JOIN shop s ON b.shop_id = s.shop_id
       WHERE b.barber_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 



app.get('/shops', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT shop_id, shop_name, shop_address, description, logo
       FROM shop
       ORDER BY shop_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/shops/:id', async (req, res) => {
    try {     
        const { id } = req.params;
        const result = await pool.query(
            `SELECT shop_id, shop_name, shop_address, description, logo
             FROM shop
             WHERE shop_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});                    





app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // customer check
    const customerResult = await pool.query(
      `SELECT customer_id AS id, customer_name AS name, email, password, phone, 'customer' AS role
       FROM customers
       WHERE email = $1`,
      [email]
    );

    if (customerResult.rows.length > 0) {
      const user = customerResult.rows[0];
      const ismatch = await bcrypt.compare(password, user.password);
      if (!ismatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      return res.json({
        message: 'Login successful',
        role: user.role,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
      });
    }

  
    const barberResult = await pool.query(
      `SELECT barber_id AS id, barber_name AS name, barber_email AS email, password, phone, 'barber' AS role
       FROM barber
       WHERE barber_email = $1`,
      [email] 
    );
    
    if (barberResult.rows.length > 0) {
      const barber = barberResult.rows[0];
      const ismatch = await bcrypt.compare (password , barber.password); { 
        if(!ismatch){  
      return res.status(401).json({ error: 'Invalid password' });
      }
      return res.json({
        message: 'Barber login successful',
        role: barber.role,
        user: { id: barber.id, name: barber.name, email: barber.email, phone: barber.phone }
      });
    }
    }
    res.status(404).json({ error: 'User not found' });
 }   catch (err) {
    res.status(500).json({ error: err.message });
 }
});





app.post('/barbers/:barberId/availability', async (req, res) => {
  try {
    const barberId = Number(req.params.barberId);
    const { day, start_time, end_time, active_status } = req.body;

    if (!barberId || !day || !start_time || !end_time) {
      return res.status(400).json({ error: 'barberId, day, start_time, end_time required' });
    }

    // 1) barber existence check
    const barberCheck = await pool.query(
      `SELECT barber_id FROM barber WHERE barber_id = $1`,
      [barberId]
    );
    if (barberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    // 2) time validation
    if (start_time >= end_time) {
      return res.status(400).json({ error: 'start_time must be less than end_time' });
    }

    // 3) duplicate day check (if only one slot per day allowed)
    const duplicate = await pool.query(
      `SELECT availability_id
       FROM availability
       WHERE barber_id = $1 AND day = UPPER($2)
       LIMIT 1`,
      [barberId, day]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: 'Availability for this day already exists' });
    }

    const result = await pool.query(
      `INSERT INTO availability (barber_id, day, start_time, end_time, active_status)
       VALUES ($1, UPPER($2), $3, $4, $5)
       RETURNING *`,
      [barberId, day, start_time, end_time, active_status || 'online']
    );

    res.status(201).json({ message: 'Availability added', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});  




app.post('/services', async (req, res) => {
  try {
    const { shop_id, service_type, duration, price } = req.body;

    if (!shop_id || !service_type || !duration || !price) {
      return res.status(400).json({ error: 'shop_id, service_type, duration, price required' });
    }

    const result = await pool.query(
      `INSERT INTO services (shop_id, service_type, duration, price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [shop_id, service_type, duration, price]
    );

    res.status(201).json({ message: 'Service created', service: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/services', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, sh.shop_name
       FROM services s
       JOIN shop sh ON s.shop_id = sh.shop_id
       ORDER BY s.service_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


  




app.post('/appointments', async (req, res) => {
  try {
    const { customer_id, barber_id, service_id, start_time, service_type,end_time } = req.body;

    if (!customer_id || !barber_id || !service_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'customer_id, barber_id, service_id, start_time, end_time required' });
    }

    if (start_time >= end_time) {
  return res.status(400).json({ error: 'start_time must be less than end_time' });
}

    // 1) conflict check
    const conflict = await pool.query(
      `SELECT appointment_id
       FROM appointment
       WHERE barber_id = $1
         AND status IN ('pending','confirmed')
         AND start_time < $3::timestamp
         AND end_time > $2::timestamp
       LIMIT 1`,
      [barber_id, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Barber already booked in this slot' });
    }

    // 2) create appointment
    const result = await pool.query(
      `INSERT INTO appointment (customer_id, barber_id, service_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, 'pending')
       RETURNING *`,
      [customer_id, barber_id, service_id, start_time, end_time]
    );

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/appointments', async (req, res) => {
    try{
        const result = await pool.query(
            `SELECT a.appointment_id, a.start_time, a.end_time, a.status,
                    c.customer_name, b.barber_name, s.service_type, s.price
             FROM appointment a
             JOIN customers c ON a.customer_id = c.customer_id
             JOIN barber b ON a.barber_id = b.barber_id
             JOIN services s ON a.service_id = s.service_id
             ORDER BY a.appointment_id DESC`
        );

        res.json({ appointments: result.rows });        
    } catch (err) {
        res.status(500).json({ error: err.message });       
    }
})



app.get('/appointments/:id',async (req, res) => {
    try{
        const { id } = req.params;
        const result= await pool.query(
            `SELECT a.appointment_id, a.start_time, a.end_time, a.status,
            c.customer_name, b.barber_name, s.service_type, s.price
            FROM appointment a
            JOIN customers c ON a.customer_id = c.customer_id
            JOIN barber b ON a.barber_id = b.barber_id
            JOIN services s ON a.service_id = s.service_id
            WHERE a.appointment_id = $1`,
            [id]        
        )
        res.json({ appointments: result.rows[0] }); 
    } catch (err) {
        res.status(500).json({ error: err.message });           
    }
})




app.patch('/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE appointment
       SET status = $1
       WHERE appointment_id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Status updated', appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






app.post('/ratings', async (req, res) => {
  try {
    const { barber_id, customer_id, rating, comments } = req.body;

    if (!barber_id || !customer_id || !rating || !comments) {
      return res.status(400).json({ error: 'barber_id, customer_id, rating, comments required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be 1-5' });
    }

    const result = await pool.query(
      `INSERT INTO rating (barber_id, customer_id, rating, comments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [barber_id, customer_id, rating, comments || null]
    );

    res.status(201).json({ message: 'Rating added', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/barber/:barberId/ratings', async (req, res) => {
    try {   
        const { barberId } = req.params;
        const result = await pool.query(
            `SELECT r.rating_id, r.rating, r.comments, c.customer_name
             FROM rating r
             JOIN customers c ON r.customer_id = c.customer_id
             WHERE r.barber_id = $1
             ORDER BY r.rating_id DESC`,
            [barberId]
        );

        res.json({ ratings: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.listen(4000, () =>{
    console.log('Server is running on port 4000');
});