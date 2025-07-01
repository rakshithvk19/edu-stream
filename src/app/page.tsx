import React from "react";
import {
  Play,
  Upload,
  Users,
  Video,
  BookOpen,
  Star,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: <Upload className="w-8 h-8 text-blue-600" />,
      title: "Easy Video Upload",
      description:
        "Upload your educational content with rich metadata in just a few clicks",
    },
    {
      icon: <Play className="w-8 h-8 text-purple-600" />,
      title: "Seamless Streaming",
      description:
        "Adaptive video playback powered by Cloudflare Stream for optimal viewing",
    },
    {
      icon: <Users className="w-8 h-8 text-green-600" />,
      title: "Student-Friendly",
      description:
        "Responsive design that works perfectly on all devices and screen sizes",
    },
    {
      icon: <BookOpen className="w-8 h-8 text-orange-600" />,
      title: "Educational Focus",
      description:
        "Purpose-built for educational content with organized course structure",
    },
  ];

  const stats = [
    { number: "99.9%", label: "Uptime" },
    { number: "4K", label: "Video Quality" },
    { number: "Fast", label: "Loading" },
    { number: "24/7", label: "Available" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Educator",
      content:
        "EduStream has transformed how I deliver content to my students. The interface is intuitive and the video quality is exceptional.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Course Creator",
      content:
        "The upload process is so simple, and my students love the responsive video player. Perfect for online learning!",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Video className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduStream
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/videos"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Browse Videos
              </a>
              <a
                href="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Content
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Stream Education
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Seamlessly
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              A modern Learning Management System that makes video sharing
              simple. Upload, organize, and stream educational content with
              professional-grade quality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/videos"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Explore Videos
              </a>
              <a
                href="/upload"
                className="bg-white text-gray-800 px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 flex items-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Start Uploading
              </a>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-60 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-pink-200 rounded-full opacity-60 animate-pulse delay-2000"></div>
      </section>

      {/* Stats Section */}
      <section className="bg-white/60 backdrop-blur-sm py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="p-6">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for
              <span className="text-blue-600"> Modern Learning</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with cutting-edge technology to provide the best educational
              streaming experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powered by Modern Technology
            </h2>
            <p className="text-xl opacity-90">
              Built with industry-leading tools for reliability and performance
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            {[
              "Next.js",
              "Tailwind CSS",
              "Supabase",
              "Cloudflare",
              "Vercel",
            ].map((tech, index) => (
              <div key={index} className="text-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-4 hover:bg-white/30 transition-colors">
                  <div className="text-2xl font-bold">{tech}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Educators
            </h2>
            <p className="text-xl text-gray-600">
              See what our users have to say about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-gray-900 to-blue-900 py-24 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join educators who are already using EduStream to deliver
            exceptional learning experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/upload"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
            <a
              href="/videos"
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-colors"
            >
              View Demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Video className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-2xl font-bold">EduStream</span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>
                &copy; 2024 EduStream. Built with Next.js, Tailwind CSS, and
                modern web technologies.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
