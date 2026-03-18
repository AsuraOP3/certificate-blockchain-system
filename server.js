const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    walletAddress: String,
    role: { type: String, enum: ['issuer', 'student', 'verifier'], default: 'student' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Certificate Schema
const certificateSchema = new mongoose.Schema({
    certificateId: String,
    studentName: String,
    studentEmail: String,
    courseName: String,
    issueDate: Date,
    grade: String,
    certificateHash: String,
    ipfsHash: String,
    issuerWallet: String,
    isRevoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Certificate = mongoose.model('Certificate', certificateSchema);

// Blockchain Setup
let web3;
let contract;
let contractABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_studentName", "type": "string"},
            {"internalType": "string", "name": "_courseName", "type": "string"},
            {"internalType": "bytes32", "name": "_certificateHash", "type": "bytes32"}
        ],
        "name": "issueCertificate",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_certificateHash", "type": "bytes32"}],
        "name": "verifyCertificate",
        "outputs": [
            {"internalType": "bool", "name": "", "type": "bool"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "bool", "name": "", "type": "bool"},
            {"internalType": "address", "name": "", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

try {
    web3 = new Web3('https://sepolia.infura.io/v3/your_infura_key_here');
    // You'll update this after deploying contract
    const contractAddress = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    contract = new web3.eth.Contract(contractABI, contractAddress);
    console.log('✅ Blockchain connection established');
} catch (error) {
    console.error('❌ Blockchain connection error:', error);
}

// File Upload Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Register User
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, walletAddress, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            walletAddress,
            role: role || 'student'
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                walletAddress: user.walletAddress
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                walletAddress: user.walletAddress
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Issue Certificate
app.post('/api/issue-certificate', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        const { studentName, studentEmail, courseName, grade, certificateHash } = req.body;
        
        if (!certificateHash) {
            return res.status(400).json({ error: 'Certificate hash is required' });
        }
        
        // Create certificate record
        const certificate = new Certificate({
            certificateId: 'CERT-' + Date.now(),
            studentName,
            studentEmail,
            courseName,
            grade,
            certificateHash,
            issuerWallet: req.user.walletAddress || '0x1234...',
            issueDate: new Date()
        });
        
        await certificate.save();
        
        // Here you would also call blockchain contract to issue certificate
        // For demo, we'll simulate blockchain issuance
        
        res.json({
            message: 'Certificate issued successfully',
            certificate: {
                id: certificate.certificateId,
                hash: certificateHash,
                studentName: certificate.studentName,
                courseName: certificate.courseName
            }
        });
    } catch (error) {
        console.error('Certificate issuance error:', error);
        res.status(500).json({ error: 'Failed to issue certificate' });
    }
});

// Verify Certificate
app.post('/api/verify-certificate', async (req, res) => {
    try {
        const { certificateHash } = req.body;
        
        // Check in database
        const certificate = await Certificate.findOne({ certificateHash });
        
        if (!certificate) {
            return res.json({
                isValid: false,
                message: 'Certificate not found in database'
            });
        }
        
        // Check if revoked
        if (certificate.isRevoked) {
            return res.json({
                isValid: false,
                message: 'Certificate has been revoked',
                certificate: certificate
            });
        }
        
        // Check on blockchain (simulated for demo)
        // In production, you'd call: await contract.methods.verifyCertificate(certificateHash).call()
        
        res.json({
            isValid: true,
            message: 'Certificate is valid',
            certificate: {
                studentName: certificate.studentName,
                courseName: certificate.courseName,
                issueDate: certificate.issueDate,
                grade: certificate.grade,
                certificateId: certificate.certificateId
            }
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get User Certificates
app.get('/api/my-certificates', authenticateToken, async (req, res) => {
    try {
        const certificates = await Certificate.find({ studentEmail: req.user.email });
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});