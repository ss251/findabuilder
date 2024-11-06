'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Search, MapPin, Zap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TalentCredential {
  earned_at: string;
  id: string;
  category: string;
  last_calculated_at: string;
  name: string;
  score: number;
  type: string;
  value: string;
}

interface Message {
  type: 'bot' | 'user' | 'profile';
  content?: string;
  passport_profile?: {
    display_name: string;
    bio: string;
    location: string;
    tags: string[];
    image_url?: string;
  };
  activity_score?: number;
  identity_score?: number;
  skills_score?: number;
  score?: number;
  human_checkmark?: boolean;
  credentials?: TalentCredential[];
  socials?: { profile_name: string; source: string; profile_url: string }[];
  verified?: boolean;
  verified_wallets?: string[];
}

interface PassportSocial {
  disconnected: boolean;
  follower_count: number | null;
  following_count: number | null;
  location: string | null;
  profile_bio: string;
  profile_display_name: string;
  profile_image_url: string | null;
  profile_name: string;
  profile_url: string;
  source: string;
}

interface BuilderResponse {
  name?: string;
  passport_profile?: {
    display_name: string;
    bio: string;
    location: string | null;
    tags: string[];
    image_url: string;
  };
  description?: string;
  location?: string;
  tags?: string[];
  image_url?: string;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  score: number;
  human_checkmark: boolean;
  credentials?: TalentCredential[];
  socials?: PassportSocial[];
  passport_socials?: PassportSocial[];
  verified: boolean;
  verified_wallets: string[];
}

interface BuilderDetails extends BuilderResponse {
  isLoading?: boolean;
}

const searchBuilders = async (query: string) => {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in search process:', error);
    throw error;
  }
};

const SOCIAL_ICONS = {
  basename: "https://www.base.org/_next/static/media/usernameBaseLogo.c13052c9.svg",
  farcaster: "https://raw.githubusercontent.com/vrypan/farcaster-brand/main/icons/icon-rounded/purple-white.png",
  github: "https://w7.pngwing.com/pngs/646/324/png-transparent-github-computer-icons-github-logo-monochrome-head-thumbnail.png",
  lens: "https://avatars.githubusercontent.com/u/108458858?s=200&v=4",
  linkedin: "https://content.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg"
} as const;

export default function TalentScoutChat() {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: "Welcome to findabuilder, powered by Galadriel AI and Talent Protocol. Discover talented builders in the web3 space." }
  ]);
  const [inputValue, setInputValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderDetails | null>(null);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messages])

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      setMessages(prev => [...prev, { type: 'user', content: inputValue }]);
      setInputValue('');
      setIsSearching(true);
      setError(null);

      try {
        const result = await searchBuilders(inputValue);
        setMessages(prev => [...prev, { type: 'bot', content: result.content }]);
        
        if (result.builders?.length === 1) {
          const builderId = result.builders[0].verified_wallets[0];
          const detailedResponse = await fetch(`/api/builder/${builderId}`);
          if (detailedResponse.ok) {
            const detailedBuilder = await detailedResponse.json();
            setMessages(prev => [...prev, { 
              type: 'profile',
              passport_profile: {
                display_name: detailedBuilder.name,
                bio: detailedBuilder.description,
                location: detailedBuilder.location,
                tags: detailedBuilder.tags,
                image_url: detailedBuilder.image_url
              },
              activity_score: detailedBuilder.activity_score,
              identity_score: detailedBuilder.identity_score,
              skills_score: detailedBuilder.skills_score,
              score: detailedBuilder.score,
              human_checkmark: detailedBuilder.human_checkmark,
              credentials: detailedBuilder.credentials,
              socials: detailedBuilder.socials,
              verified: detailedBuilder.verified,
              verified_wallets: detailedBuilder.verified_wallets
            }]);
          } else {
            throw new Error('Failed to fetch detailed builder profile');
          }
        } else {
          const builders = result.builders?.map((builder: BuilderResponse) => ({
            name: builder.name || builder.passport_profile?.display_name,
            description: builder.description || builder.passport_profile?.bio,
            location: builder.location || builder.passport_profile?.location || 'Remote',
            tags: builder.tags || builder.passport_profile?.tags || [],
            image_url: builder.image_url || builder.passport_profile?.image_url,
            activity_score: builder.activity_score,
            identity_score: builder.identity_score,
            skills_score: builder.skills_score,
            score: builder.score,
            human_checkmark: builder.human_checkmark,
            credentials: builder.credentials || [],
            socials: builder.socials || builder.passport_socials?.map((social: PassportSocial) => ({
              profile_name: social.profile_name,
              source: social.source,
              profile_url: social.profile_url
            })),
            verified: builder.verified,
            verified_wallets: builder.verified_wallets
          }));

          if (builders?.length > 0) {
            for (const builder of builders) {
              setMessages(prev => [...prev, { 
                type: 'profile',
                passport_profile: {
                  display_name: builder.name,
                  bio: builder.description,
                  location: builder.location,
                  tags: builder.tags,
                  image_url: builder.image_url
                },
                activity_score: builder.activity_score,
                identity_score: builder.identity_score,
                skills_score: builder.skills_score,
                score: builder.score,
                human_checkmark: builder.human_checkmark,
                credentials: builder.credentials,
                socials: builder.socials,
                verified: builder.verified,
                verified_wallets: builder.verified_wallets
              }]);
            }
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error:', error);
        setError('An error occurred while searching. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSendMessage();
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleConnectBuilder = async (builderId: string) => {
    setSelectedBuilder({ isLoading: true } as BuilderDetails);
    setShowBuilderDialog(true);

    try {
      const response = await fetch(`/api/builder/${builderId}`);
      if (!response.ok) throw new Error('Failed to fetch builder details');
      
      const data = await response.json();
      setSelectedBuilder({ ...data, isLoading: false });
    } catch (error) {
      console.error('Error fetching builder:', error);
      setSelectedBuilder(null);
      // Optionally show error message
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
      <nav className="bg-gray-900/50 backdrop-blur-sm py-4 fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-white">findabuilder.</h1>
          <div className="flex items-center space-x-2">
            {/* <Button 
              variant={isWalletConnected ? "default" : "outline"} 
              className={`${isWalletConnected ? 'bg-white text-black' : 'bg-transparent border-gray-700 text-white'} hover:bg-gray-200 hover:text-black hidden md:flex transition-all duration-300`}
              onClick={handleWalletConnection}
            >
              <Wallet className="mr-2 h-4 w-4" /> 
              {isWalletConnected ? 'Connected' : 'Connect Wallet'}
            </Button> */}
            {/* <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-gray-900 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <Button 
                    variant={isWalletConnected ? "default" : "outline"} 
                    className={`${isWalletConnected ? 'bg-white text-black' : 'bg-transparent border-gray-700 text-white'} hover:bg-gray-200 hover:text-black w-full transition-all duration-300`}
                    onClick={handleWalletConnection}
                  >
                    <Wallet className="mr-2 h-4 w-4" /> 
                    {isWalletConnected ? 'Connected' : 'Connect Wallet'}
                  </Button>
                </div>
              </SheetContent>
            </Sheet> */}
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto flex flex-col py-6 px-4 mt-16">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex-grow overflow-auto mb-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'profile' ? (
                <Card className="bg-gray-900/50 backdrop-blur-sm border-0 w-full max-w-md overflow-hidden transition-all duration-300 hover:shadow-lg rounded-xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 rounded-xl border border-gray-800/50">
                        <AvatarImage 
                          src={message.passport_profile?.image_url || 
                            `https://api.dicebear.com/6.x/initials/svg?seed=${message.passport_profile?.display_name}`
                          } 
                          className="rounded-xl"
                        />
                        <AvatarFallback className="rounded-xl">{message.passport_profile?.display_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl font-bold text-white">
                            {message.passport_profile?.display_name}
                          </CardTitle>
                          {message.verified && (
                            <Badge className="bg-green-500/10 text-green-500 px-2 py-0.5 text-xs font-medium rounded-full">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-gray-400 flex items-center mb-3">
                          <MapPin className="h-4 w-4 mr-1" /> {message.passport_profile?.location}
                        </CardDescription>
                        {message.socials && message.socials.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {message.socials.map((social, i) => (
                              <a 
                                key={i}
                                href={social.profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex-shrink-0"
                              >
                                <Badge 
                                  variant="outline" 
                                  className="bg-gray-800/30 hover:bg-gray-700/30 text-gray-300 px-2 py-1 flex items-center gap-1.5 transition-all duration-200 rounded-lg border-gray-700/30"
                                >
                                  <img 
                                    src={SOCIAL_ICONS[social.source as keyof typeof SOCIAL_ICONS]} 
                                    alt={social.source}
                                    className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100"
                                  />
                                  <span className="truncate text-xs group-hover:text-white transition-colors max-w-[120px]">
                                    {social.profile_name}
                                  </span>
                                </Badge>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-300">{message.passport_profile?.bio}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.passport_profile?.tags.map((tag, i) => (
                        <Badge 
                          key={`${tag}-${i}`} 
                          variant="secondary" 
                          className="bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/10 rounded-lg text-xs py-1 px-2"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 w-16">Activity</span>
                        <div className="flex-1 mx-3">
                          <Progress 
                            value={message.activity_score} 
                            className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8 text-right">{message.activity_score}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 w-16">Identity</span>
                        <div className="flex-1 mx-3">
                          <Progress 
                            value={message.identity_score} 
                            className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8 text-right">{message.identity_score}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 w-16">Skills</span>
                        <div className="flex-1 mx-3">
                          <Progress 
                            value={message.skills_score} 
                            className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8 text-right">{message.skills_score}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Badge className="bg-indigo-500/10 text-indigo-300 px-3 py-1 text-lg font-bold rounded-lg border border-indigo-500/20">
                        {message.score}
                      </Badge>
                      {(!message.socials || message.socials.length === 0) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-lg bg-transparent"
                          onClick={() => handleConnectBuilder(message.verified_wallets?.[0] || '')}
                        >
                          <Zap className="mr-2 h-4 w-4" /> Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className={`rounded-lg px-4 py-2 max-w-[80%] sm:max-w-md ${
                  message.type === 'user' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800'
                } transition-all duration-300 hover:shadow-md`}>
                  {message.content}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="mb-6">
          {/* <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 text-gray-200 hover:bg-gray-800/50 cursor-pointer">
              who&apos;s hiring
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition-colors duration-200">
              defi builders
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition-colors duration-200">
              solidity devs
            </Badge>
          </div> */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for builders..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full bg-gray-900/50 backdrop-blur-sm border-gray-800 focus:border-indigo-500 text-base md:text-lg py-2 pr-10 transition-all duration-300 ease-in-out text-white placeholder-gray-500"
            />
            <Button
              size="icon"
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-transparent hover:bg-gray-800 transition-all duration-300 ease-in-out"
              onClick={() => void handleSendMessage()}
              disabled={isSearching}
              aria-label="Send message"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <Search className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-800 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Builder Details</DialogTitle>
          </DialogHeader>
          {selectedBuilder?.isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full bg-gray-800" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px] bg-gray-800" />
                  <Skeleton className="h-4 w-[150px] bg-gray-800" />
                </div>
              </div>
              <Skeleton className="h-20 w-full bg-gray-800" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-800" />
                <Skeleton className="h-4 w-full bg-gray-800" />
                <Skeleton className="h-4 w-2/3 bg-gray-800" />
              </div>
            </div>
          ) : selectedBuilder ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedBuilder.image_url} />
                  <AvatarFallback>{selectedBuilder.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-lg font-semibold">{selectedBuilder.name}</h4>
                  <p className="text-sm text-gray-400 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" /> {selectedBuilder.location}
                  </p>
                </div>
              </div>
              
              {selectedBuilder.socials && selectedBuilder.socials.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedBuilder.socials.map((social, i) => (
                    <a 
                      key={i}
                      href={social.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex-shrink-0"
                    >
                      <Badge 
                        variant="outline" 
                        className="bg-gray-800/30 hover:bg-gray-700/30 text-gray-300 px-2 py-1 flex items-center gap-1.5 transition-all duration-200 rounded-lg border-gray-700/30"
                      >
                        <img 
                          src={SOCIAL_ICONS[social.source as keyof typeof SOCIAL_ICONS]} 
                          alt={social.source}
                          className="w-3.5 h-3.5 object-contain opacity-80 group-hover:opacity-100"
                        />
                        <span className="truncate text-xs group-hover:text-white transition-colors max-w-[120px]">
                          {social.profile_name}
                        </span>
                        {social.follower_count !== null && (
                          <span className="text-xs text-gray-400 ml-1">
                            · {social.follower_count}
                          </span>
                        )}
                      </Badge>
                    </a>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-300">{selectedBuilder.description}</p>
              
              <div className="flex flex-wrap gap-1.5">
                {selectedBuilder.tags?.map((tag, i) => (
                  <Badge 
                    key={i}
                    variant="secondary" 
                    className="bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/10 rounded-lg text-xs py-1 px-2"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 w-16">Activity</span>
                  <div className="flex-1 mx-3">
                    <Progress 
                      value={selectedBuilder.activity_score} 
                      className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">{selectedBuilder.activity_score}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 w-16">Identity</span>
                  <div className="flex-1 mx-3">
                    <Progress 
                      value={selectedBuilder.identity_score} 
                      className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">{selectedBuilder.identity_score}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 w-16">Skills</span>
                  <div className="flex-1 mx-3">
                    <Progress 
                      value={selectedBuilder.skills_score} 
                      className="h-1.5 [&>div]:bg-indigo-500 bg-gray-800/50" 
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">{selectedBuilder.skills_score}%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Badge className="bg-indigo-500/10 text-indigo-300 px-3 py-1 text-lg font-bold rounded-lg border border-indigo-500/20">
                  {selectedBuilder.score}
                </Badge>
                {selectedBuilder.verified && (
                  <Badge className="bg-green-500/10 text-green-500 px-2 py-0.5 text-xs font-medium rounded-full">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              Failed to load builder details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}