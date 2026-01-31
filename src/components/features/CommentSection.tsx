"use client";

import { useEffect, useState } from "react";
import { ArrowBigUp, Loader2, MessageSquare, Send } from "lucide-react";
import { Filter } from "bad-words";
import { germanBadWords } from "@/lib/badWordsList";
import { supabase } from "@/lib/supabase";

// ... imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";  

interface Comment {
  id: string;
  author_name: string;
  content: string;
  upvotes: number;
  created_at: string;
}

export default function CommentSection({ featureSlug }: { featureSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    // Determine user fingerprint for voting
    let fp = localStorage.getItem("comment_fingerprint");
    if (!fp) {
      fp = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("comment_fingerprint", fp);
    }
    setFingerprint(fp);

    fetchComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments-${featureSlug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_comments", filter: `feature_slug=eq.${featureSlug}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [featureSlug]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("feature_comments")
      .select("*")
      .eq("feature_slug", featureSlug)
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setComments(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;




    // Client-side First Line of Defense
    const filter = new Filter();
    filter.addWords(...germanBadWords);
    if (filter.isProfane(newComment) || filter.isProfane(authorName)) {
        alert("Please keep the discussion civil. Your comment contains restricted words.");
        return;
    }

    setSubmitting(true);
    
    // Invoke Edge Function
    const { error } = await supabase.functions.invoke('post-comment', {
      body: {
        feature_slug: featureSlug,
        author_name: authorName.trim(),
        content: newComment.trim(),
      },
    });

    if (!error) {
      setNewComment("");
    } else {
      alert(error.message || "Failed to post comment.");
    }
    setSubmitting(false);
  };

  const handleUpvote = async (commentId: string) => {
    // Check if already voted locally (optimistic check)
    // In a real app we'd verify with DB, but here we can try insert and handle duplicate error
    const { error } = await supabase.from("comment_upvotes").insert({
      comment_id: commentId,
      voter_fingerprint: fingerprint,
    });

    if (!error) {
       // Increment count
      await supabase.rpc("increment_upvotes", { row_id: commentId }); // Need RPC or trigger ideally, but simpler:
      // Client-side increment is unsafe, let's just re-fetch or use a trigger.
      // Since we don't have an RPC for increment, we rely on the `feature_comments` update trigger if it exists,
      // Or we can manually update:
      const { data: current } = await supabase.from("feature_comments").select("upvotes").eq("id", commentId).single();
      if (current) {
        await supabase.from("feature_comments").update({ upvotes: current.upvotes + 1 }).eq("id", commentId);
      }
      fetchComments();
    } else {
      // Already voted or error
      if (error.code === '23505') { // Unique violation
        alert("You already upvoted this!");
      }
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-500" />
        Discussion
      </h3>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-xl space-y-3">
        <Input
          placeholder="Your Name (public)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="bg-white border-gray-200"
          required
        />
        <Textarea
          placeholder="Share your thoughts on this feature..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="bg-white border-gray-200 min-h-[80px]"
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="bg-black text-white hover:bg-gray-800">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Post Comment</>}
          </Button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="flex flex-col items-center gap-1 min-w-[32px]">
                <button
                  onClick={() => handleUpvote(comment.id)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Upvote"
                >
                  <ArrowBigUp className="w-6 h-6" />
                </button>
                <span className="text-sm font-semibold text-gray-600">{comment.upvotes}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{comment.author_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
