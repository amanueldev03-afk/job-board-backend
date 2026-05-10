const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    role: {
        type: String,
        enum: ['candidate', 'company', 'admin'],
        default: 'candidate'
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
   googleId: {
    type: String,
    unique: true,
    sparse: true
    },
   authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
 },
 loginAttempts: {
    type: Number,
    default: 0
},
lockUntil: {
    type: Date,
    default: null
},
    emailPreferences: {
    type: {
        marketing: { type: Boolean, default: true },
        applicationUpdates: { type: Boolean, default: true },
        jobAlerts: { type: Boolean, default: true }
    },
    default: {
        marketing: true,
        applicationUpdates: true,
        jobAlerts: true
    }
},
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    lastLogin: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date , 
    
    // Add after isVerified field (around line 40-50)
    deletionRequested: {
        type: Boolean,
        default: false
    },
    deletionToken: {
        type: String,
        default: null
    },
    deletionExpires: {
        type: Date,
        default: null
    },
    scheduledDeletionDate: {
        type: Date,
        default: null
    }
},

{
    timestamps: true
});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);