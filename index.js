const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory storage
let bookings = [];
let hotels = [
  {
    id: '1',
    name: '🌴 Grand Plaza Hotel',
    location: 'New York',
    pricePerNight: 200,
    availableRooms: 10,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    amenities: ['Pool', 'Spa', 'Restaurant', 'Gym']
  },
  {
    id: '2',
    name: '🏖️ Seaside Resort',
    location: 'Miami',
    pricePerNight: 350,
    availableRooms: 5,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400',
    amenities: ['Beach Access', 'Pool', 'Bar', 'Water Sports']
  },
  {
    id: '3',
    name: '⛰️ Mountain View Lodge',
    location: 'Denver',
    pricePerNight: 150,
    availableRooms: 8,
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=400',
    amenities: ['Hiking', 'Fireplace', 'Mountain Views', 'Restaurant']
  },
  {
    id: '4',
    name: '🏙️ City Center Inn',
    location: 'Chicago',
    pricePerNight: 120,
    availableRooms: 15,
    rating: 4.0,
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
    amenities: ['Free WiFi', 'Business Center', 'Parking', 'Restaurant']
  },
  {
    id: '5',
    name: '🌸 Sakura Boutique Hotel',
    location: 'San Francisco',
    pricePerNight: 280,
    availableRooms: 7,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
    amenities: ['Garden', 'Tea House', 'Spa', 'Fine Dining']
  }
];

// Helper functions
const validateDates = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (checkInDate < today) {
    return { valid: false, message: 'Check-in date cannot be in the past' };
  }
  if (checkOutDate <= checkInDate) {
    return { valid: false, message: 'Check-out date must be after check-in date' };
  }
  return { valid: true };
};

const calculateNights = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// API Routes
app.get('/api/hotels', (req, res) => {
  const { location, minPrice, maxPrice } = req.query;
  let filteredHotels = [...hotels];
  
  if (location) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  if (minPrice) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.pricePerNight >= parseInt(minPrice)
    );
  }
  if (maxPrice) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.pricePerNight <= parseInt(maxPrice)
    );
  }
  
  res.json({ success: true, data: filteredHotels, count: filteredHotels.length });
});

app.get('/api/hotels/:id', (req, res) => {
  const hotel = hotels.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ success: false, message: 'Hotel not found' });
  }
  res.json({ success: true, data: hotel });
});

app.get('/api/hotels/:id/availability', (req, res) => {
  const hotel = hotels.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ success: false, message: 'Hotel not found' });
  }
  
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) {
    return res.status(400).json({ success: false, message: 'Please provide check-in and check-out dates' });
  }
  
  const dateValidation = validateDates(checkIn, checkOut);
  if (!dateValidation.valid) {
    return res.status(400).json({ success: false, message: dateValidation.message });
  }
  
  const overlappingBookings = bookings.filter(booking => 
    booking.hotelId === hotel.id &&
    ((new Date(booking.checkIn) <= new Date(checkOut) && 
      new Date(booking.checkOut) >= new Date(checkIn)))
  );
  
  const availableRooms = hotel.availableRooms - overlappingBookings.length;
  
  res.json({
    success: true,
    data: {
      hotelId: hotel.id,
      hotelName: hotel.name,
      checkIn,
      checkOut,
      nights: calculateNights(checkIn, checkOut),
      availableRooms,
      totalRooms: hotel.availableRooms,
      isAvailable: availableRooms > 0,
      totalPrice: calculateNights(checkIn, checkOut) * hotel.pricePerNight
    }
  });
});

app.post('/api/bookings', (req, res) => {
  const { hotelId, guestName, guestEmail, guestPhone, checkIn, checkOut, numberOfGuests, specialRequests } = req.body;
  
  if (!hotelId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut || !numberOfGuests) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  const hotel = hotels.find(h => h.id === hotelId);
  if (!hotel) {
    return res.status(404).json({ success: false, message: 'Hotel not found' });
  }
  
  const dateValidation = validateDates(checkIn, checkOut);
  if (!dateValidation.valid) {
    return res.status(400).json({ success: false, message: dateValidation.message });
  }
  
  const overlappingBookings = bookings.filter(booking => 
    booking.hotelId === hotelId &&
    ((new Date(booking.checkIn) <= new Date(checkOut) && 
      new Date(booking.checkOut) >= new Date(checkIn)))
  );
  
  if (overlappingBookings.length >= hotel.availableRooms) {
    return res.status(400).json({ success: false, message: 'No rooms available for the selected dates' });
  }
  
  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = nights * hotel.pricePerNight;
  
  const booking = {
    id: uuidv4(),
    hotelId,
    hotelName: hotel.name,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    numberOfGuests,
    specialRequests: specialRequests || '',
    totalPrice,
    nights,
    status: 'confirmed',
    bookingDate: new Date().toISOString()
  };
  
  bookings.push(booking);
  res.status(201).json({ success: true, message: 'Booking created successfully!', data: booking });
});

app.get('/api/bookings', (req, res) => {
  const { email } = req.query;
  let userBookings = bookings;
  if (email) {
    userBookings = bookings.filter(b => b.guestEmail === email);
  }
  res.json({ success: true, data: userBookings, count: userBookings.length });
});

app.delete('/api/bookings/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === req.params.id);
  if (bookingIndex === -1) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  bookings[bookingIndex].status = 'cancelled';
  res.json({ success: true, message: 'Booking cancelled successfully' });
});

// Serve the colorful frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Hotel Booking App running on http://localhost:${PORT}`);
});
