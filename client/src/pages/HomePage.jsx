import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, ControlOutlined, SearchOutlined } from '@ant-design/icons';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div 
        className="relative w-full h-[95vh] min-h-[600px] flex flex-col justify-center overflow-hidden border-b-[6px] border-[#ff9933]"
        style={{ 
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(to right, #0f172a 0%, rgba(15, 23, 42, 0.95) 45%, rgba(15, 23, 42, 0.4) 75%, rgba(15, 23, 42, 0.1) 100%), url("/images/gov-hero.jpg")', 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        
        {/* Abstract Tricolor Glow Orbs (Subtle over dark background) */}
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-[#ff9933] rounded-full mix-blend-screen filter blur-[128px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[30rem] h-[30rem] bg-[#138808] rounded-full mix-blend-screen filter blur-[128px] opacity-10 pointer-events-none"></div>



        {/* PM Modi Image Anchor (Enlarged & Blended) */}
        <div className="absolute bottom-0 right-0 w-full md:w-[70%] lg:w-[65%] h-full flex justify-end items-end z-0 opacity-40 md:opacity-[0.85] pointer-events-none">
           <img 
             src="/images/pm-modi.png" 
             alt="PM Narendra Modi" 
             className="h-full object-contain object-right-bottom origin-bottom-right scale-105 xl:scale-110 drop-shadow-2xl"
             style={{
               maskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)',
               WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%, black 100%)'
             }}
           />
        </div>

        {/* Deep navy overlay gradient to perfectly fade the image into the dark background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/60 to-transparent z-0 pointer-events-none w-full mix-blend-multiply"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-4 leading-tight">
              <span className="block text-[#ff9933] drop-shadow-md">Empowering</span>
              <span className="block text-white mt-2 drop-shadow-md">ST Students</span>
              <span className="block text-[#10b981] mt-2 drop-shadow-md">Nationwide</span>
            </h1>
            
            <p className="mt-8 text-lg sm:text-xl text-gray-300 max-w-xl leading-relaxed font-medium">
              A unified digital platform for Scheduled Tribe students to access scholarships and fellowships — from application to selection to ongoing support. Building an inclusive India through transparent, AI-assisted governance.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row gap-5">
              <Link to="/applicant/schemes">
                <Button 
                  type="primary" 
                  size="large" 
                  className="bg-[#6366f1] hover:bg-[#4f46e5] border-none shadow-xl h-14 px-8 text-lg font-semibold flex items-center justify-center w-full sm:w-auto"
                >
                  Explore Schemes <ArrowRightOutlined className="ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  ghost
                  size="large" 
                  className="h-14 px-8 text-lg font-semibold border-2 border-white text-white hover:text-[#818cf8] hover:border-[#818cf8] flex items-center justify-center w-full sm:w-auto shadow-sm"
                >
                  Track Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section (Below Hero) */}
      <div className="bg-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Platform Capabilities</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              A modern, transparent, and efficient system designed to streamline the administration of tribal welfare schemes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <ControlOutlined className="text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Configurable Schemes</h3>
              <p className="text-gray-600">
                Support for National Fellowship (NFST), National Overseas Scholarship (NOS), and easily adaptable for future schemes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircleOutlined className="text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Assisted Verification</h3>
              <p className="text-gray-600">
                Faster, transparent document checks using advanced AI to assist officers and reduce processing delays.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <SearchOutlined className="text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">End-to-End Tracking</h3>
              <p className="text-gray-600">
                Complete lifecycle management from initial application submission to selection and ongoing fellowship disbursement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
