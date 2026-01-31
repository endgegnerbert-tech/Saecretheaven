interface FeedbackButtonProps {
  featureName: string;
  question?: string;
  className?: string;
}

export default function FeedbackButton({ featureName, question, className = "" }: FeedbackButtonProps) {
  const subject = encodeURIComponent(`Feedback: ${featureName}`);
  const body = question ? encodeURIComponent(`\n\nQuestion: ${question}\n\nMy feedback:\n`) : encodeURIComponent(`\n\nMy feedback:\n`);
  const mailtoLink = `mailto:einar@black-knight.dev?subject=${subject}&body=${body}`;

  return (
    <a
      href={mailtoLink}
      className={`text-xs font-bold text-gray-400 hover:text-black border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-400 transition-colors inline-block ${className}`}
    >
      Give Feedback
    </a>
  );
}
