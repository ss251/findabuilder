'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Wallet, Menu, Search, MapPin, Zap } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  };
  activity_score?: number;
  identity_score?: number;
  skills_score?: number;
  score?: number;
  human_checkmark?: boolean;
  credentials?: TalentCredential[];
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

export default function TalentScoutChat() {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: "Welcome to findabuilder, powered by AI. Discover talented builders in the web3 space." }
  ]);
  const [inputValue, setInputValue] = useState('')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        
        for (const builder of result.builders) {
          setMessages(prev => [...prev, { 
            type: 'profile',
            passport_profile: {
              display_name: builder.name,
              bio: builder.description,
              location: builder.location,
              tags: builder.tags
            },
            activity_score: builder.activity_score,
            identity_score: builder.identity_score,
            skills_score: builder.skills_score,
            score: builder.score,
            human_checkmark: builder.human_checkmark,
            credentials: builder.credentials
          }]);
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

  const handleWalletConnection = () => {
    setIsWalletConnected(!isWalletConnected);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
      <nav className="bg-gray-900/50 backdrop-blur-sm py-4 fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-white">findabuilder</h1>
          <div className="flex items-center space-x-2">
            {/* <Button 
              variant={isWalletConnected ? "default" : "outline"} 
              className={`${isWalletConnected ? 'bg-white text-black' : 'bg-transparent border-gray-700 text-white'} hover:bg-gray-200 hover:text-black hidden md:flex transition-all duration-300`}
              onClick={handleWalletConnection}
            >
              <Wallet className="mr-2 h-4 w-4" /> 
              {isWalletConnected ? 'Connected' : 'Connect Wallet'}
            </Button> */}
            <Sheet>
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
            </Sheet>
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
                <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 w-full max-w-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12 border border-gray-700">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${message.passport_profile?.display_name}`} />
                        <AvatarFallback>{message.passport_profile?.display_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl font-bold text-white">{message.passport_profile?.display_name}</CardTitle>
                        <CardDescription className="text-gray-400 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" /> {message.passport_profile?.location}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 mb-4">{message.passport_profile?.bio}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {message.passport_profile?.tags.map((tag, i) => (
                        <Badge key={`${tag}-${i}`} variant="secondary" className="bg-gray-800/50 text-gray-200 hover:bg-gray-700/50">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Activity</span>
                        <Progress value={message.activity_score} className="w-2/3 bg-gray-800" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Identity</span>
                        <Progress value={message.identity_score} className="w-2/3 bg-gray-800" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Skills</span>
                        <Progress value={message.skills_score} className="w-2/3 bg-gray-800" />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <Badge className="bg-indigo-500 text-white px-3 py-1 text-lg font-bold">
                        {message.score}
                      </Badge>
                      <Button variant="outline" size="sm" className="text-indigo-400 border-indigo-400 hover:bg-indigo-400 hover:text-white">
                        <Zap className="mr-2 h-4 w-4" /> Connect
                      </Button>
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 text-gray-200 hover:bg-gray-800/50 cursor-pointer">
              who&apos;s hiring
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition-colors duration-200">
              defi builders
            </Badge>
            <Badge variant="secondary" className="bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer transition-colors duration-200">
              solidity devs
            </Badge>
          </div>
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
    </div>
  )
}