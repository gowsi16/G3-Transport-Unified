import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Mail, Truck, Building2, Clock, CheckCircle2,
  Send, User, MessageSquare, Package, FileText, AlertCircle, Loader2
} from 'lucide-react';
import { bookingApi } from '../../services/bookingApi';

const SUBJECTS = [
  'Booking Enquiry',
  'Shipment Tracking',
  'Pricing & Quotation',
  'Complaint / Issue',
  'Invoice / Billing',
  'Driver / Lorry Issue',
  'General Enquiry',
  'Other'
];

export default function ContactPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', subject: '', order_id: '', message: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { ticket_id }

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email.';
    if (!form.subject) errs.subject = 'Please select a subject.';
    if (!form.message.trim()) errs.message = 'Message is required.';
    else if (form.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const result = await bookingApi.submitContact(form);
      setSubmitted({ ticket_id: result.ticket_id });
      setForm({ full_name: '', email: '', phone: '', subject: '', order_id: '', message: '' });
    } catch (err) {
      setErrors({ general: err.message || 'Failed to submit. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const contactDetails = [
    {
      icon: <Building2 className="text-green-600" size={22} />,
      title: 'Company Name',
      lines: ['G3 Transport', 'GST: 33CGJPB4116R1ZA']
    },
    {
      icon: <MapPin className="text-green-600" size={22} />,
      title: 'Address',
      lines: ['Lorry Market Street,', 'Shevapet, Salem - 636002']
    },
    {
      icon: <Phone className="text-green-600" size={22} />,
      title: 'Phone / WhatsApp',
      lines: [
        <a key="1" href="tel:+919488289991" className="hover:text-green-700 transition-colors">+91 94882 89991</a>,
        <a key="2" href="tel:+919080942982" className="hover:text-green-700 transition-colors">+91 90809 42982</a>
      ]
    },
    {
      icon: <Mail className="text-green-600" size={22} />,
      title: 'Email',
      lines: [
        <a key="1" href="mailto:gthreetransport@gmail.com" className="hover:text-green-700 transition-colors break-all">gthreetransport@gmail.com</a>,
        <a key="2" href="mailto:gowsilan16@gmail.com" className="hover:text-green-700 transition-colors break-all">gowsilan16@gmail.com</a>
      ]
    },
    {
      icon: <Truck className="text-green-600" size={22} />,
      title: 'Fleet',
      lines: [
        'TN 77AY 3006 — Heavy Lorry (8 Tons)',
        'TN28 BF 1256 — Medium Lorry (3.5 Tons)'
      ]
    },
    {
      icon: <Clock className="text-green-600" size={22} />,
      title: 'Business Hours',
      lines: ['Mon – Sat: 8:00 AM – 8:00 PM', 'Sunday: Emergency Only']
    }
  ];

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors[field]
      ? 'border-red-400 focus:ring-red-300 bg-red-50'
      : 'border-gray-200 focus:ring-green-400 focus:border-green-400 bg-white'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-10 px-4">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
          Get In Touch
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500 max-w-lg mx-auto text-sm">
          Have a question, need a quote, or want to track your shipment? We're here to help.
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ─── Left: Company Info ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Building2 size={20} className="text-green-700" />
              Company Information
            </h2>
            <div className="space-y-5">
              {contactDetails.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{item.title}</p>
                    {item.lines.map((line, j) => (
                      <p key={j} className="text-sm text-gray-700 leading-relaxed">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Link */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=Lorry%20Market%20Street%2C%20Shevapet%2C%20Salem%20-%20636002"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-green-700 hover:bg-green-800 text-white text-center py-3 rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
          >
            <MapPin size={16} className="inline mr-2 -mt-0.5" />
            View on Google Maps
          </a>
        </motion.div>

        {/* ─── Right: Contact Form ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 inline-block">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-widest mb-1">Your Reference Number</p>
                    <p className="text-xl font-mono font-bold text-green-800">{submitted.ticket_id}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">Save this number to track your enquiry status.</p>
                  <button
                    onClick={() => setSubmitted(null)}
                    className="mt-6 text-green-700 hover:text-green-800 text-sm font-semibold underline underline-offset-2"
                  >
                    Submit another enquiry
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Send Us a Message</h2>
                    <p className="text-sm text-gray-500">All fields marked <span className="text-red-500">*</span> are required.</p>
                  </div>

                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle size={16} /> {errors.general}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                        <User size={12} className="inline mr-1" />Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={inputClass('full_name')}
                      />
                      {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                        <Mail size={12} className="inline mr-1" />Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={inputClass('email')}
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                        <Phone size={12} className="inline mr-1" />Phone Number
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass('phone')}
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                        <MessageSquare size={12} className="inline mr-1" />Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className={inputClass('subject')}
                      >
                        <option value="">Select a subject...</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                    </div>
                  </div>

                  {/* Order ID */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                      <Package size={12} className="inline mr-1" />Related Booking / Order ID
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      name="order_id"
                      value={form.order_id}
                      onChange={handleChange}
                      placeholder="e.g. BK202600001"
                      className={inputClass('order_id')}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                      <FileText size={12} className="inline mr-1" />Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe your enquiry or issue in detail..."
                      className={`${inputClass('message')} resize-none`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.message
                        ? <p className="text-red-500 text-xs">{errors.message}</p>
                        : <span />}
                      <span className="text-xs text-gray-400">{form.message.length} chars</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                  >
                    {loading
                      ? <><Loader2 size={18} className="animate-spin" /> Sending...</>
                      : <><Send size={18} /> Send Message</>
                    }
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    You'll receive a reference ticket number after submission.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
