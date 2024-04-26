import React from 'react';

const ReactionDetails = ({ reactions }) => {
  return (
    <div className="reaction-details">
      <h2>Reactions</h2>
      <ul>
        {reactions.map((reaction, index) => (
          <li key={index}>
            {reaction.userId}: {reaction.emoji}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReactionDetails;
