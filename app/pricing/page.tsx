"use client";

import Navbar from "@/components/Navbar";
import ShaderBackground from "@/components/ShaderBackground";

export default function PricingPage() {
  return (
    <ShaderBackground>
      {/* Navbar */}
      <Navbar />

       {/* Content */}
       <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
         <div className="max-w-7xl mx-auto">
           {/* Header */}
           <div className="text-center mb-12">
             <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
               Plans from first idea to full scale
             </h1>
             <p className="text-lg text-gray-300 max-w-2xl mx-auto">
               Start for free. Upgrade when you're ready.
             </p>
           </div>

           {/* Pricing Cards */}
           <div className="grid lg:grid-cols-5 gap-4 max-w-6xl mx-auto mb-12">
             {/* Free Plan */}
             <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full">
               <div className="mb-6">
                 <h3 className="text-xl font-bold text-white mb-3">Free</h3>
                 <div className="text-3xl font-bold text-white mb-3">
                   $0
                 </div>
                 <p className="text-gray-400 mb-4 text-sm">Perfect for trying out AI-powered Web3 development</p>
               </div>
               
               <div className="space-y-2 mb-6">
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">10 message credits</span> / month
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">3 projects maximum</span>
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">100 integration credits</span> / month
                 </div>
               </div>

               <div className="space-y-3 flex-grow mb-6">
                 <h4 className="text-gray-300 font-medium text-sm">Plan highlights:</h4>
                 <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Community support</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Basic smart contracts</span>
                   </li>
                 </ul>
               </div>

               <button className="w-full py-2.5 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm mt-auto">
                 Get started
               </button>
             </div>

             {/* Starter Plan */}
             <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full">
               <div className="mb-6">
                 <h3 className="text-xl font-bold text-white mb-3">Starter</h3>
                 <div className="text-3xl font-bold text-white mb-2">
                   $16
                   <span className="text-lg font-normal text-gray-400">/mo</span>
                 </div>
                 <p className="text-gray-400 mb-4 text-sm">Build your first Web3 apps for personal projects</p>
               </div>
               
               <div className="space-y-2 mb-6">
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">100 message credits</span> / month
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">2,000 integration credits</span> / month
                 </div>
               </div>

               <div className="space-y-3 flex-grow mb-6">
                 <h4 className="text-gray-300 font-medium text-sm">Plan highlights:</h4>
                 <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Unlimited dApps</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Code editing</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Smart contracts</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Custom domain</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">GitHub integration</span>
                   </li>
                 </ul>
               </div>

               <button className="w-full py-2.5 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm mt-auto">
                 Get started
               </button>
             </div>

             {/* Builder Plan */}
             <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full">
               <div className="mb-6">
                 <h3 className="text-xl font-bold text-white mb-3">Builder</h3>
                 <div className="text-3xl font-bold text-white mb-2">
                   $40
                   <span className="text-lg font-normal text-gray-400">/mo</span>
                 </div>
                 <p className="text-gray-400 mb-4 text-sm">Professional Web3 development tools</p>
               </div>
               
               <div className="space-y-2 mb-6">
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">250 message credits</span> / month
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">10,000 integration credits</span> / month
                 </div>
               </div>

               <div className="space-y-3 flex-grow mb-6">
                 <h4 className="text-gray-300 font-medium text-sm">Plan highlights:</h4>
                 <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Advanced DeFi protocols</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Multi-chain support</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">NFT marketplace tools</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">DAO governance</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Priority support</span>
                   </li>
                 </ul>
               </div>

               <button className="w-full py-2.5 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm mt-auto">
                 Get started
               </button>
             </div>

             {/* Pro Plan */}
             <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500 rounded-xl p-6 backdrop-blur-sm relative flex flex-col h-full">
               <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                 <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-black px-2 py-1 rounded-full text-xs font-semibold">
                   Most Popular
                 </span>
               </div>
               
               <div className="mb-6">
                 <h3 className="text-xl font-bold text-white mb-3">Pro</h3>
                 <div className="text-3xl font-bold text-white mb-2">
                   $80
                   <span className="text-lg font-normal text-gray-400">/mo</span>
                 </div>
                 <p className="text-gray-300 mb-4 text-sm">Advanced Web3 development for serious builders</p>
               </div>
               
               <div className="space-y-2 mb-6">
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">500 message credits</span> / month
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">20,000 integration credits</span> / month
                 </div>
               </div>

               <div className="space-y-3 flex-grow mb-6">
                 <h4 className="text-gray-300 font-medium text-sm">Plan highlights:</h4>
                 <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Custom smart contracts</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Cross-chain bridges</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Yield farming protocols</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Beta features access</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Premium support</span>
                   </li>
                 </ul>
               </div>

               <button className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-semibold text-sm mt-auto">
                 Get started
               </button>
             </div>

             {/* Elite Plan */}
             <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full">
               <div className="mb-6">
                 <h3 className="text-xl font-bold text-white mb-3">Elite</h3>
                 <div className="text-3xl font-bold text-white mb-2">
                   $160
                   <span className="text-lg font-normal text-gray-400">/mo</span>
                 </div>
                 <p className="text-gray-400 mb-4 text-sm">Enterprise-grade Web3 infrastructure</p>
               </div>
               
               <div className="space-y-2 mb-6">
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">1,200 message credits</span> / month
                 </div>
                 <div className="text-sm text-gray-300">
                   <span className="font-semibold">50,000 integration credits</span> / month
                 </div>
               </div>

               <div className="space-y-3 flex-grow mb-6">
                 <h4 className="text-gray-300 font-medium text-sm">Plan highlights:</h4>
                 <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Custom AI models</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">On-premise deployment</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">Dedicated support team</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">SLA guarantees</span>
                   </li>
                   <li className="flex items-center gap-2 text-gray-300">
                     <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     <span className="text-xs">White-label solutions</span>
                   </li>
                 </ul>
               </div>

               <button className="w-full py-2.5 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm mt-auto">
                 Get started
               </button>
             </div>
          </div>

           {/* FAQ Section */}
           <div className="text-center">
             <h3 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h3>
             <div className="grid md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
               <div className="space-y-6">
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">What's included in the free plan?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">Get 10 message credits per month, up to 3 projects, and access to basic Web3 templates. Perfect for trying out AI-powered dApp development.</p>
                 </div>
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">Can I upgrade or downgrade anytime?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">Yes! Change your plan at any time. Changes take effect immediately with prorated billing.</p>
                 </div>
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">What are message credits?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">Message credits are used when you interact with our AI to create or modify Web3 applications. Each conversation message consumes one credit.</p>
                 </div>
               </div>
               <div className="space-y-6">
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">What blockchain networks are supported?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">We support Ethereum, Polygon, Arbitrum, Optimism, Base, and other EVM-compatible networks. Custom networks available for Elite plans.</p>
                 </div>
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">Do you offer refunds?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">Yes, we offer a 14-day money-back guarantee for all paid plans. Full refund if you're not satisfied.</p>
                 </div>
                 <div>
                   <h4 className="text-lg font-semibold text-white mb-2">What types of dApps can I build?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">Build NFT marketplaces, DeFi protocols, DAOs, DEX platforms, yield farming apps, and more with our AI-powered tools.</p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </ShaderBackground>
  );
}
