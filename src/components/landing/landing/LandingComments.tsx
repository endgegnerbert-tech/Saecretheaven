"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { MessageSquare, ArrowBigUp, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Filter } from "bad-words";

import { germanBadWords } from "@/lib/badWordsList";

// ...



const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ... inside component



interface Comment {
  id: string;
  feature_slug: string;
  author_name: string;
  content: string;
  upvotes: number;
  created_at: string;
}

export default function LandingComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTopComments();
  }, []);

  const fetchTopComments = async () => {
    const { data } = await supabase
      .from("feature_comments")
      .select("*")
      .order("upvotes", { ascending: false })
      .limit(6);

    if (data) setComments(data);
    setLoading(false);
  };

  const getFeatureName = (slug: string) => {
    switch (slug) {
      case "panic-button": return "Panic Button";
      case "secure-drop": return "Secure Drop";
      case "metadata-removal": return "Metadata Removal";
      case "decoy-accounts": return "Decoy Accounts";
      case "landing-page": return "General Feedback";
      default: return slug.replace(/-/g, " ");
    }
  };


  const containsProfanity = (text: string) => {
    const filter = new Filter();
    filter.addWords(...germanBadWords);
    try {
        return filter.isProfane(text);
    } catch (e) {
        return false; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;

    if (containsProfanity(newComment) || containsProfanity(authorName)) {
      alert("Please keep the discussion civil. Your comment contains restricted words.");
      return;
    }

    setSubmitting(true);
    
    // Invoke Edge Function for AI Moderation & Insertion
    const { data, error } = await supabase.functions.invoke('post-comment', {
      body: {
        feature_slug: "landing-page",
        author_name: authorName.trim(),
        content: newComment.trim(),
      },
    });

    if (!error) {
      setNewComment("");
      setAuthorName("");
      alert("Thank you for your feedback!");
      fetchTopComments();
    } else {
      console.error("Submission error:", error);
      // Data might contain the specific error message from the function
      // If error is from Supabase Invoke (e.g. 500), 'error' is populated.
      // If function returns 400 with body, invoke might treat it as error depending on implementation, 
      // typically for 400/500 Supabase JS puts it in 'error'.
      alert(error.message || "Failed to post comment. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section id="community" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
            <MessageSquare size={16} />
            <span>Community Feedback</span>
          </div>
          <h2 className="font-space-grotesk text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Top Feature Requests
          </h2>
          <p className="max-w-2xl mx-auto font-inter text-gray-600 text-lg mb-8">
            See what the community is saying about our upcoming features.
          </p>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-left">
            <h3 className="font-space-grotesk text-lg font-semibold text-gray-900 mb-4">Leave your thoughts</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter text-sm"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="What functionality would you like to see?"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-inter text-sm min-h-[80px]"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Comments strictly moderated. Hate speech and spam will be automatically removed.
            </p>
          </form>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{comment.author_name}</h3>
                    <a
                      href={`/features/${comment.feature_slug}`}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      on {getFeatureName(comment.feature_slug)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    <ArrowBigUp size={16} />
                    <span className="text-sm font-medium">{comment.upvotes}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                  "{comment.content}"
                </p>
                
                <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {!loading && comments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                No comments yet. Be the first to leave one on our feature pages!
            </div>
        )}
      </div>
    </section>
  );
}
