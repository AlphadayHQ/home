import React from "react";
import "../assets/css/feedback.css"

const FeedBack = () => {
  return (
    <section>
      <a class="profilePicture">
        <img src="src/assets/feedback/background.jpg" alt="Profile Picture" />
      </a>

      <div class="userName">Alphaday Feedback</div>

      <div class="description">
        Please choose the amount of feedback you want to give us. More feedback
        allows us to get more insight but all of it is appreciated!
      </div>

      <div class="links">
        <a class="link" href="https://forms.gle/UH42Lm5hdsUWvCKx7">
          <i class="fas fa-hourglass-start">&nbsp;</i>Short (1-2 mins)
        </a>
        <a class="link" href="https://forms.gle/ttbSfqV7geSTRGL1A">
          <i class="fas fa-hourglass-half">&nbsp;</i>Average (3-5 mins)
        </a>
        <a class="link" href="https://forms.gle/3TqpEnmFK9Zzkhhj7">
          <i class="fas fa-hourglass-end">&nbsp;</i>Long (5-10 mins)
        </a>
      </div>

      <div class="source">
        <i class="fab fa-discord">&nbsp;</i> Don't forget to join our
        <a href="https://alphaday.com/discord">Discord</a> if you haven't
        already! <i class="fab fa-discord">&nbsp;</i>
      </div>
    </section>
  );
};

export default FeedBack;
