const mongoose = require('mongoose');

// 1. First define the Counter model
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

// 2. Then define the employeeSchema
const employeeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Employee name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  employeeNumber: {
    type: Number,
    unique: true
    // Not required anymore, it will be auto-generated
  },
  position: { 
    type: String, 
    required: [true, 'Position is required'],
    trim: true
  },
  department: { 
    type: String, 
    required: [true, 'Department is required'],
    trim: true
  },
  basicSalary: { 
    type: Number, 
    required: [true, 'Basic salary is required'], 
    min: [0, 'Salary cannot be negative']
  },
  joinDate: { 
    type: Date, 
    default: Date.now,
    validate: {
      validator: function(v) {
        return v <= Date.now();
      },
      message: 'Join date cannot be in the future'
    }
  },
  contact: { 
    type: String, 
    unique: true,
    required: [true, 'Contact number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: 'Please enter a valid contact number'
    }
  },
email: { 
  type: String, 
  sparse: true,
  lowercase: true,
  trim: true,
  default: undefined,  // This ensures no null values
  validate: {
    validator: function(v) {
      if (!v) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    },
    message: 'Please enter a valid email address'
  }
},
 status: { 
  type: String, 
  enum: ['active', 'inactive'], 
  default: 'active',
  validate: {
    validator: function(v) {
      // Any custom validation for inactive status?
      return true;
    },
    message: props => `${props.value} is not a valid status`
  }
},
  avatar: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 3. Auto-increment employeeNumber using pre-save hook
employeeSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'employeeNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.employeeNumber = counter.seq;
    next();
  } catch (err) {
    next(err);
  }
});

const salarySchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: [true, 'Employee ID is required'] 
  },
  month: { 
    type: Number, 
    required: [true, 'Month is required'], 
    min: [1, 'Month must be between 1-12'], 
    max: [12, 'Month must be between 1-12'] 
  },
  year: { 
    type: Number, 
    required: [true, 'Year is required'],
    validate: {
      validator: function(v) {
        return v >= 2000 && v <= 2100;
      },
      message: 'Year must be between 2000-2100'
    }
  },
  basicSalary: { 
    type: Number, 
    required: [true, 'Basic salary is required'], 
    min: [0, 'Basic salary cannot be negative'] 
  },
  allowances: { 
    type: Number, 
    default: 0, 
    min: [0, 'Allowances cannot be negative'] 
  },
  deductions: { 
    type: Number, 
    default: 0, 
    min: [0, 'Deductions cannot be negative'] 
  },
  bonuses: { 
    type: Number, 
    default: 0, 
    min: [0, 'Bonuses cannot be negative'] 
  },
  netSalary: { 
    type: Number, 
    required: [true, 'Net salary is required'], 
    min: [0, 'Net salary cannot be negative'],
    validate: {
      validator: function(v) {
        const calculated = this.basicSalary + this.allowances - this.deductions + this.bonuses;
        return Math.abs(v - calculated) < 0.01; // Allow for floating point rounding
      },
      message: 'Net salary must equal basic + allowances - deductions + bonuses'
    }
  },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'cancelled'], 
    default: 'pending' 
  },
  paymentDate: { 
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return this.status === 'paid' || 'Payment date can only be set for paid salaries';
      }
    }
  },
  employeeName: { type: String },
  employeePosition: { type: String },
  department: { type: String },
  employeeContact: { type: String },
  employeeEmail: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


const advanceSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  reason: { 
    type: String, 
    required: true,
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  repayments: [{
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    date: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const attendanceSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'half-day', 'leave'], 
    required: true 
  },
  checkIn: { type: Date },
  checkOut: { type: Date },
  notes: { 
    type: String,
    trim: true 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
employeeSchema.index({ name: 'text', position: 'text', department: 'text', email: 'text' });
employeeSchema.index({ status: 1 });
employeeSchema.index({ joinDate: -1 });
salarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ status: 1 });
advanceSchema.index({ employeeId: 1, status: 1 });
advanceSchema.index({ date: -1 });
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });

// Export models
exports.Employee = mongoose.model('Employee', employeeSchema);
exports.Salary = mongoose.model('Salary', salarySchema);
exports.Advance = mongoose.model('Advance', advanceSchema);
exports.Attendance = mongoose.model('Attendance', attendanceSchema);
exports.Counter = Counter;
