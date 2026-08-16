# Constellation

constellation is a platform, that i a secure closed environment, develops conneections with individuals present around, sharing the same sentiments/ fellings. It is a privacy-conscious platform that does not show your shared thoughts with other individuals present in the same space. Constellation is more of a social connection experiment, not a mental-health treatment platform or crisis-support service.
```

The central idea is:
- People can either enter a space via the generated space code or they can create their own space.
- Each person receives an anonymous Star ID for respective spaces.
- They privately write what they are carrying emotionally.
- The platform converts that thought into an embedding.
- The thoughts are saved visually in the form of constellations.
- Once two indivuals' thoughts are matched via the AI integrated in the system, a connection is created between the two. The connection is delibertaely not created between more than two people to avoid over whelmed emotions.
- Neither participant sees the other person’s original thought.
- The second participant whose thoughts match with any of the already created constellation in the space can propose propose a small shared activity.
- The other participant can accept or decline, its entirely up-to them..
- A connection is confirmed only if both people opt in, and can proceed to complete the activity.


## The “Why” Behind Constellation:

I've always been an introvert and talking to people has always been a hard task for me. when I started univeristy, it took me a lot of time making friends or even simply connecting with my classmates, and that really affected my ental health in the worst possible way, so the purpose of creating constellation was to bridge gaps between humans who feel they are alone.


## The “Why” Behind The Name:

stars and galaxies have always fascinated me. The idea that in such a vast universe, no star is alone, is extremely important to me. That's why i chose to name this platform as constellation.

people may feel alone at:

- universities
- conferences
- hackathons
- workplaces
- community events
- support-oriented gatherings
- unfamiliar social environments

The difficulty is not always the absence of people. Sometimes the problem is that nobody knows who else is experiencing something similar. Constellation is designed in a way that gives a breather to people feeling emotionally over-whelmed or disconneced in closed spaces.


- Two people may describe the same feeling using different vocabulary. specific keywords being hardcoded to match would miss many of those shared feelings. Hene, Semantic approach was understood and used, because i came to learn while brainstorming that semantic matching can identify and distinguish similar phrases in the sentences. So, in the application, actualy text remains private while its numerical vector data is computed and compared for matching.

For example:

```text
“I came here alone and feel left out.”

“I arrived by myself and everyone already knows each other.”
```

These sentences use different words but communicate a similar experience.


# Users and Roles


## Space creator

A space creator starts a new space where constellations exist. Their responsibilities are limited to:

- naming the space.
- receiving a shareable space code.
- giving the code to intended participants.

The current version does not provide a separate administrator dashboard.

## Participant

A participant joins the space with the provided code. once, they enter the space, the first thing they get is an anaonymous anonymous Star ID which works as their identification in the space. they can submit more than one private thought, how ever, the star remains one for every one person, unlesss they enter the same space with a diff id. They may receive a semantic match. They can send or receive activity invitation and can accept or decline the invitation.


## Invitation sender

The participant whose thought produces a match can view the mconnection-matched screen, can opt to make a connection, select the activity, confirm the invitation and wait for the matcher's response.


## Invitation receiver

The matched participant receives receive the invitation through Supabase Realtime. On the invitation, they can see their as well as the senders star id. They see the proposed activity and can accept or reject the proposal.


## The system

The platform is responsible for:

1. validating space and participant data
2. limiting the word count of the submitted text
3. producing an embedding
4. storing the thought privately in the supabase.
5. finding a different participant with a semantically similar thought
6. storing and broadcasting invitation changes
7. maintaining mutual-consent screens

# The complete user flow experienc.

1. A person creates or joins a space.
2. The application generates an anonymous Star ID.
3. The participant writes a short thought.
4. The thought is sent to a server-side API route.
5. The API checks it for unsafe content.
6. If allowed, the API generates a 512-dimensional embedding.
7. The thought and embedding are stored in Supabase.
8. A PostgreSQL function compares the embedding with other thoughts.
9. Thoughts from the same participant are excluded.
10. A match is returned only when it crosses the similarity threshold at 0.60.
11. The participant sees a shared-signal screen.
12. They may choose a predefined shared activity.
13. The invitation is stored with a pending status.
14. The other participant receives it through Realtime.
15. The receiver accepts or declines.
16. Supabase updates the invitation status.
17. The sender receives the response through Realtime.
18. If accepted, both participants see a confirmed connection.
```

# 6. how the matching takes place ( key feature )

An embedding is used to convert the text into a list of numbers. Texts with similar ideas have numbers closer to one another. This, however, does not prove that two people have identical emotions, personalities, needs, or life circumstances.

constellation uses:

```text
text-embedding-3-small
512 dimensions
```

1. The frontend sends the thought to `/api/embed`.
2. The API route verifies it for appropriation.
3. The OpenAI embedding model generates a vector.
4. Supabase stores the vector in the `thoughts` table.
5. The frontend invokes the `match_thoughts` PostgreSQL function.
6. The function compares vectors using cosine similarity.
7. It returns a match above the configured threshold.

(The concept of embedding was entirely new to me so help was taken From AI during the writing or code and debugging)


# privacy-conscious design choices

 The current version of constellation displays privacy embedded design, but it isnt a completely production level anonymous. 

# safety:
while searching about how to prevent inapporiate or wrong texts from entering the system, i got to know about openAI model omni-moderation-latest that was used to flag that type of textual content that may be considered as explicit and inappropriate and appropriate messages get displayed on screen incase of such texual evident being tried to release into the system


# 9. why chat has not been added to the platform for two individuals who develop a connection:
 I considered adding freeform chat after a successful match. I chose not to include it in the MVP because chat introduces significantly more privacy, moderation, safety, and abuse-prevention requirements. The current experience intentionally stops at a mutually accepted activity. Chat would also require more storahe for messages, authorization and spam prevention aswell.


# The tech stack used:


| Technology | Purpose |
|---|---|
| Next.js | Application framework and App Router |
| React | Interactive user interface and state |
| TypeScript | frontend and backend code |
| OpenAI Moderation | Checks submissions before matching |
| OpenAI Embeddings | Creates semantic representations of thoughts |
| Supabase PostgreSQL | Stores spaces, participants, thoughts and invitations |
| pgvector | Stores and compares embedding vectors |
| Supabase RPC | Invokes the database matching function |
| Supabase Realtime | Delivers invitations and responses across devices |
| Vercel | Hosts and deploys the Next.js application |
| CSS/Tailwind | Visual styling and responsive layout |

---> the entire ui is created in the globals.css


# The database tables that were created in supabase. 
The reason for choosing supabase for storage was because supabase works well with Next.js and provides an embedded backend framework with authorization as well as RLS.

## `spaces` contained colums

```text
id
name
code
created_at
```

## `participants` contained columns

```text
id
space_id
star_id
has_released
created_at
```

## `thoughts` contained columns

```text
id
space_id
participant_id
text
embedding
created_at
```

## `connection_invitations` contained columns


```text
id
space_id
sender_id
receiver_id
activity
status
created_at
```

## `match_thoughts`

This is a PostgreSQL function. AI helped me define and work through this function as embedding was an entirely new concept for me to learn. this func gets the embedding, space id, current partcipant id and similarity threshold. it searches existing thought and excludes any from the same partcipant then semantically matches the candidates having similar thoughts.

The API checks that the responder is the intended receiver and that the invitation is still pending.

# realtime behavior

Supabase Realtime is used for two events. Inorder to see the invitation card via insertion into ```text
connection_invitations. 

and filtering by  
```text
receiver_id = current participant ID
```
```
The second purpose is the invitation response by updating the specific invitation row.




## Initial concept

The original visual concept involved drawing a line between semantically matched Stars inside the constellation. but the problem i encountered was that the visualization, since i was unfamiliar with the technology was fragile and required specific positioning which i was unable to do.


## Roles:

I designed and built the project as an individual hackathon submission. My work included product definition, interaction design, frontend development, backend API routes, Supabase integration, semantic matching, realtime synchronization, safety decisions, testing and deployment.
```

LIVE PLATFORM LINK: https://constellation-qhkh-7upbh1w4e-areebasajjals-projects.vercel.app/


