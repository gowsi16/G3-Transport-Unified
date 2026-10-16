import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, ShieldCheck, Clock, MapPin, Phone, Mail, Building2,
  CheckCircle2, Send, User, MessageSquare, Package, FileText,
  AlertCircle, Loader2, Navigation, Award, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../../services/bookingApi';

const fontDisplay = { fontFamily: "'Space Grotesk', sans-serif" };
const fontBody = { fontFamily: "'IBM Plex Sans', sans-serif" };

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

export default function AboutPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    subject: '',
    order_id: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

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
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const result = await bookingApi.submitContact(form);
      setSubmitted({ ticket_id: result.ticket_id });
      setForm({ full_name: '', email: '', phone: '', subject: '', order_id: '', message: '' });
    } catch (err) {
      setErrors({ general: err.message || 'Failed to submit message. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const contactDetails = [
    {
      icon: <Building2 className="text-green-600" size={20} />,
      title: 'Company & Tax ID',
      lines: ['G3 Transport Logistics', 'GSTIN: 33CGJPB4116R1ZA']
    },
    {
      icon: <MapPin className="text-green-600" size={20} />,
      title: 'Salem Dispatch Office',
      lines: ['Lorry Market Street,', 'Shevapet, Salem - 636002']
    },
    {
      icon: <Phone className="text-green-600" size={20} />,
      title: 'Direct Dispatch Lines',
      lines: [
        <a key="1" href="tel:+919488289991" className="hover:text-green-700 font-semibold transition-colors">+91 94882 89991</a>,
        <a key="2" href="tel:+919080942982" className="hover:text-green-700 font-semibold transition-colors">+91 90809 42982</a>
      ]
    },
    {
      icon: <Mail className="text-green-600" size={20} />,
      title: 'Official Email Support',
      lines: [
        <a key="1" href="mailto:gthreetransport@gmail.com" className="hover:text-green-700 transition-colors break-all">gthreetransport@gmail.com</a>,
        <a key="2" href="mailto:gowsilan16@gmail.com" className="hover:text-green-700 transition-colors break-all">gowsilan16@gmail.com</a>
      ]
    },
    {
      icon: <Clock className="text-green-600" size={20} />,
      title: 'Business Hours',
      lines: [
        'Mon – Sat: 8:00 AM – 8:00 PM',
        'Sunday: 24/7 Emergency Dispatch'
      ]
    }
  ];

  const fleetDetails = [
    {
      reg: 'TN 77AY 3006',
      type: 'Heavy Commercial Lorry',
      capacity: '8.0 Tons (8,000 kg)',
      ideal: 'Bulk freight, industrial goods, heavy machinery & agro consignments',
      status: 'Active Fleet'
    },
    {
      reg: 'TN 28BF 1256',
      type: 'Medium Commercial Lorry',
      capacity: '3.5 Tons (3,500 kg)',
      ideal: 'Intra-city shifts, FMCG distribution, light manufactured cargo',
      status: 'Active Fleet'
    }
  ];

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-400 focus:ring-red-300 bg-red-50'
        : 'border-gray-200 focus:ring-green-500 focus:border-green-500 bg-white'
    }`;

  return (
    <div className="w-full space-y-12 animate-slide-up pb-12" style={fontBody}>
      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="hero-bg rounded-3xl p-8 md:p-14 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-green-200 mb-4 border border-white/20">
            <Award size={14} className="text-green-300" />
            Reliable Tamil Nadu Road Logistics
          </div>
          <h1 style={fontDisplay} className="text-3xl md:text-5xl font-bold leading-tight mb-4 drop-shadow-sm">
            About G3 Transport & Contact Us
          </h1>
          <p className="text-base md:text-lg text-emerald-100 max-w-2xl leading-relaxed mb-6">
            Headquartered in Salem, G3 Transport is your trusted partner for high-efficiency lorry transport,
            verified drivers, transparent pricing, and seamless consignment tracking across Tamil Nadu.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#contact-section"
              className="bg-white text-green-800 hover:bg-emerald-50 px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all shadow-md"
            >
              Contact & Support Form <ArrowRight size={16} />
            </a>
            <Link
              to="/book"
              className="bg-green-700/80 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all border border-green-500/30"
            >
              <Truck size={16} /> Book a Lorry
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Who We Are & Mission ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="premium-card p-8 md:p-10 border border-green-100 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-6 shadow-sm border border-green-200">
              <Building2 size={24} />
            </div>
            <h2 style={fontDisplay} className="text-2xl font-bold text-slate-800 mb-4">
              Who We Are
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              G3 Transport is a premier commercial logistics and road freight service based in 
              Salem, Tamil Nadu. We bridge the gap between businesses and dependable lorry transport with 
              a modern, data-driven approach to booking and route optimization.
            </p>
            <p className="text-slate-600 leading-relaxed">
              From heavy manufacturing hubs in Coimbatore and Chennai to agro-trading centres across 
              Salem, Namakkal, and Erode, our fleet handles industrial freight, bulk materials, 
              and commercial consignments safely and on schedule.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-green-100 flex items-center gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle2 size={16} /> Verified Fleet
            </span>
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle2 size={16} /> Fast Turnaround
            </span>
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle2 size={16} /> 24/7 Tracking
            </span>
          </div>
        </div>

        <div className="premium-card p-8 md:p-10 border border-green-100 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6 shadow-sm border border-emerald-200">
              <Navigation size={24} />
            </div>
            <h2 style={fontDisplay} className="text-2xl font-bold text-slate-800 mb-4">
              Our Core Mission
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              To modernize commercial transport by providing transparent, upfront pricing, real-time vehicle 
              visibility, and guaranteed reliability without the hassles of manual negotiation and unpredictable transit delays.
            </p>
            <div className="space-y-3 mt-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  <strong className="text-slate-800">100% Certified Drivers:</strong> Trained, background-verified professionals with commercial licenses.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  <strong className="text-slate-800">Transparent Pricing:</strong> Standardized rate cards computed from verified highway distances with zero hidden costs.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  <strong className="text-slate-800">Live GPS & Status Tracking:</strong> Customers track vehicle dispatch, in-transit progress, and delivery confirmation online.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-green-100 text-xs text-slate-500">
            Headquartered in Vellalagundam, Salem &bull; Servicing all major commercial corridors
          </div>
        </div>
      </section>

      {/* ─── Active Fleet Overview ───────────────────────────────────────── */}
      <section className="bg-white rounded-3xl p-8 md:p-10 border border-green-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-green-700 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-200">
              Fleet Capacity
            </span>
            <h2 style={fontDisplay} className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">
              Our Dedicated Commercial Vehicles
            </h2>
          </div>
          <p className="text-sm text-slate-500 max-w-md">
            Our company-operated fleet is systematically maintained and inspected to guarantee uninterrupted transit across South India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fleetDetails.map((v, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-2xl p-6 border border-green-100 hover:border-green-300 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-600 text-white rounded-xl shadow-md">
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{v.type}</h3>
                    <span className="font-mono text-xs font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">
                      {v.reg}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {v.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600 pt-3 border-t border-green-100">
                <div className="flex justify-between py-1 border-b border-green-100/60">
                  <span className="text-slate-500 text-xs uppercase font-medium">Payload Capacity:</span>
                  <span className="font-bold text-slate-800">{v.capacity}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 text-xs uppercase font-medium">Best For:</span>
                  <span className="text-right text-xs font-medium text-slate-700 max-w-[220px]">{v.ideal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Contact & Support Section (Merged Contact Us) ───────────────── */}
      <section id="contact-section" className="pt-4">
        <div className="text-center mb-10">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-green-200">
            Get In Touch & Support
          </span>
          <h2 style={fontDisplay} className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
            Contact Salem Dispatch & Support
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            Need an instant quote, driver coordination, booking assistance, or issue resolution? 
            Reach our Salem office directly or submit an enquiry below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left: Contact Info & Maps */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-5"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 md:p-7 space-y-6">
              <h3 style={fontDisplay} className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-green-100 pb-3">
                <Building2 size={20} className="text-green-700" />
                Office Information
              </h3>

              <div className="space-y-5">
                {contactDetails.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="mt-1 p-2 rounded-xl bg-green-50 text-green-700 border border-green-100 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {item.title}
                      </p>
                      {item.lines.map((line, j) => (
                        <p key={j} className="text-sm text-slate-700 leading-snug">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Google Maps External Link */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=Lorry%20Market%20Street%2C%20Shevapet%2C%20Salem%20-%20636002"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white text-center py-3.5 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Open in Google Maps
              </a>
            </div>

            {/* Quick Dispatch Card */}
            <div className="bg-emerald-900 text-emerald-100 rounded-3xl p-6 shadow-md border border-emerald-800">
              <h4 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                <Phone size={18} className="text-emerald-400" /> Need Immediate Dispatch?
              </h4>
              <p className="text-xs text-emerald-200 mb-3">
                For urgent intra-state lorry bookings and emergency freight dispatch, call directly:
              </p>
              <div className="font-mono font-bold text-emerald-300 text-lg tracking-wider">
                +91 94882 89991 / 90809 42982
              </div>
            </div>
          </motion.div>

          {/* Right: Interactive Message & Enquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 md:p-8">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 style={fontDisplay} className="text-2xl font-bold text-slate-800 mb-2">
                      Message & Enquiry Received!
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                      Thank you for contacting G3 Transport. Our Salem logistics desk has registered your enquiry and will respond within 24 hours.
                    </p>

                    <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 inline-block mb-4 shadow-sm">
                      <p className="text-xs text-green-700 font-semibold uppercase tracking-widest mb-1">
                        Your Support Ticket Number
                      </p>
                      <p className="text-2xl font-mono font-bold text-green-800 tracking-wider">
                        {submitted.ticket_id}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 block mb-6">
                      Please quote this ticket number for any follow-up on your query.
                    </p>

                    <button
                      onClick={() => setSubmitted(null)}
                      className="text-green-700 hover:text-green-800 font-bold text-sm underline underline-offset-4"
                    >
                      Send another message / enquiry
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
                      <h3 style={fontDisplay} className="text-xl font-bold text-slate-800 mb-1">
                        Send Us an Enquiry or Message
                      </h3>
                      <p className="text-xs text-slate-500">
                        Fill out the details below. Required fields are marked with <span className="text-red-500">*</span>
                      </p>
                    </div>

                    {errors.general && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle size={16} /> {errors.general}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                          <User size={12} className="inline mr-1" /> Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          placeholder="e.g. Ramesh Kumar"
                          className={inputClass('full_name')}
                        />
                        {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                          <Mail size={12} className="inline mr-1" /> Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="name@company.com"
                          className={inputClass('email')}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                          <Phone size={12} className="inline mr-1" /> Phone Number
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
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                          <MessageSquare size={12} className="inline mr-1" /> Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          className={inputClass('subject')}
                        >
                          <option value="">Select subject / topic...</option>
                          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                      </div>
                    </div>

                    {/* Order ID */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                        <Package size={12} className="inline mr-1" /> Related Booking or Consignment ID
                        <span className="text-slate-400 font-normal ml-1 lowercase">(optional)</span>
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
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">
                        <FileText size={12} className="inline mr-1" /> Message & Query Details <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="message"
                        rows={4}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Please describe your transport requirement, cargo weight/size, route, or query..."
                        className={`${inputClass('message')} resize-none`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {errors.message
                          ? <p className="text-red-500 text-xs">{errors.message}</p>
                          : <span />}
                        <span className="text-xs text-slate-400">{form.message.length} characters</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-sm cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Submitting Enquiry...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Submit Enquiry
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                      Our dispatch team monitors enquiries 8 AM – 8 PM Mon–Sat. You will receive a unique ticket reference ID upon submission.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
