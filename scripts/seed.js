const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');
const Patient = require('../src/models/patient.model');
const Doctor = require('../src/models/doctor.model');
const config = require('../src/config/config');

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB for seeding'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Seed data
const seedDatabase = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create doctors
        const doctors = [
            {
                email: 'dr.smith@example.com',
                password: await bcrypt.hash('password123', 10),
                name: {
                    first: 'John',
                    last: 'Smith'
                },
                phone: '555-123-4567',
                role: 'doctor',
                specialization: 'Cardiology',
                licenseNumber: 'MD123456',
                experience: 15,
                education: [
                    {
                        degree: 'MD',
                        institution: 'Harvard Medical School',
                        year: 2005
                    },
                    {
                        degree: 'Cardiology Fellowship',
                        institution: 'Mayo Clinic',
                        year: 2010
                    }
                ],
                department: 'Cardiology',
                biography: 'Dr. Smith is a board-certified cardiologist with 15 years of experience.',
                availableSlots: [
                    {
                        day: 'Monday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Wednesday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Friday',
                        startTime: '09:00',
                        endTime: '13:00'
                    }
                ]
            },
            {
                email: 'dr.patel@example.com',
                password: await bcrypt.hash('password123', 10),
                name: {
                    first: 'Neha',
                    last: 'Patel'
                },
                phone: '555-987-6543',
                role: 'doctor',
                specialization: 'Pediatrics',
                licenseNumber: 'MD789012',
                experience: 10,
                education: [
                    {
                        degree: 'MD',
                        institution: 'Johns Hopkins University',
                        year: 2010
                    },
                    {
                        degree: 'Pediatric Residency',
                        institution: 'Children\'s Hospital of Philadelphia',
                        year: 2013
                    }
                ],
                department: 'Pediatrics',
                biography: 'Dr. Patel specializes in pediatric care and has a particular interest in childhood asthma management.',
                availableSlots: [
                    {
                        day: 'Tuesday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Thursday',
                        startTime: '09:00',
                        endTime: '17:00'
                    },
                    {
                        day: 'Saturday',
                        startTime: '09:00',
                        endTime: '13:00'
                    }
                ]
            }
        ];

        const createdDoctors = await Doctor.create(doctors);
        console.log(`Created ${createdDoctors.length} doctors`);

        // Create patients
        const patients = [
            {
                email: 'patient1@example.com',
                password: await bcrypt.hash('password123', 10),
                name: {
                    first: 'Michael',
                    last: 'Johnson'
                },
                phone: '555-555-1234',
                role: 'patient',
                dateOfBirth: new Date('1985-05-15'),
                gender: 'male',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zip: '10001',
                    country: 'USA'
                },
                medicalHistory: [
                    {
                        condition: 'Hypertension',
                        diagnosedDate: new Date('2018-03-10'),
                        notes: 'Controlled with medication'
                    },
                    {
                        condition: 'Type 2 Diabetes',
                        diagnosedDate: new Date('2019-07-22'),
                        notes: 'Diet-controlled'
                    }
                ],
                allergies: ['Penicillin', 'Shellfish'],
                healthMetrics: {
                    height: 180,
                    weight: 85,
                    bloodType: 'O+'
                }
            },
            {
                email: 'patient2@example.com',
                password: await bcrypt.hash('password123', 10),
                name: {
                    first: 'Sarah',
                    last: 'Davis'
                },
                phone: '555-555-5678',
                role: 'patient',
                dateOfBirth: new Date('1992-11-28'),
                gender: 'female',
                address: {
                    street: '456 Oak Ave',
                    city: 'Los Angeles',
                    state: 'CA',
                    zip: '90001',
                    country: 'USA'
                },
                medicalHistory: [
                    {
                        condition: 'Asthma',
                        diagnosedDate: new Date('2010-02-15'),
                        notes: 'Requires inhaler during physical activity'
                    }
                ],
                allergies: ['Pollen', 'Dust mites'],
                healthMetrics: {
                    height: 165,
                    weight: 60,
                    bloodType: 'A+'
                }
            }
        ];

        const createdPatients = await Patient.create(patients);
        console.log(`Created ${createdPatients.length} patients`);

        console.log('Database seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seed
seedDatabase();