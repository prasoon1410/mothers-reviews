export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Get access token from cookie or Authorization header
  const cookieToken = req.cookies?.access_token;
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const accessToken = cookieToken || headerToken;

  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    if (req.method === 'GET') {
      // Step 1: Get account name
      const accountRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const accountData = await accountRes.json();
      if (!accountData.accounts?.length) return res.status(404).json({ error: 'No accounts found' });
      const accountName = accountData.accounts[0].name;

      // Step 2: Get locations
      const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const locData = await locRes.json();
      if (!locData.locations?.length) return res.status(404).json({ error: 'No locations found' });
      const locationName = locData.locations[0].name;

      // Step 3: Get reviews
      const reviewRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const reviewData = await reviewRes.json();

      // Format reviews
      const reviews = (reviewData.reviews || []).map(r => ({
        id: r.reviewId,
        author: r.reviewer?.displayName || 'Anonymous',
        profilePhoto: r.reviewer?.profilePhotoUrl || null,
        rating: { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.starRating] || 3,
        text: r.comment || '',
        date: r.createTime,
        replied: !!r.reviewReply,
        existingReply: r.reviewReply?.comment || null,
        reviewName: r.name,
        locationName,
      }));

      return res.status(200).json({ reviews, locationName });
    }

    if (req.method === 'POST') {
      // Post a reply
      const { reviewName, reply } = req.body;
      if (!reviewName || !reply) return res.status(400).json({ error: 'reviewName and reply required' });

      const replyRes = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: reply }),
      });

      if (!replyRes.ok) {
        const err = await replyRes.json();
        console.error('Reply error:', err);
        return res.status(replyRes.status).json({ error: err.error?.message || 'Failed to post reply' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Reviews API error:', e);
    return res.status(500).json({ error: e.message });
  }
}
