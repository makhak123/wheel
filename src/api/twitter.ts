import { TwitterApi } from "twitter-api-v2"
import { config } from "../utils/config.js"

let twitterClient: TwitterApi | null = null

export function getTwitterClient(): TwitterApi {
  if (!twitterClient) {
    twitterClient = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    })
  }
  return twitterClient
}

export interface TwitterUser {
  id: string
  username: string
  name: string
}

/**
 * Get Twitter user by username
 */
export async function getTwitterUser(username: string): Promise<TwitterUser | null> {
  try {
    const client = getTwitterClient()
    const user = await client.v2.userByUsername(username.replace("@", ""))

    if (!user.data) {
      return null
    }

    return {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
    }
  } catch (error) {
    console.error("Error fetching Twitter user:", error)
    return null
  }
}

/**
 * Post a tweet about fee collection or buyback
 */
export async function postTweet(content: string): Promise<string | null> {
  try {
    const client = getTwitterClient()
    const tweet = await client.v2.tweet(content)
    return tweet.data.id
  } catch (error) {
    console.error("Error posting tweet:", error)
    return null
  }
}

/**
 * Verify Twitter connection
 */
export async function verifyTwitterConnection(): Promise<boolean> {
  try {
    const client = getTwitterClient()
    const me = await client.v2.me()
    console.log(`✅ Twitter connected as @${me.data.username}`)
    return true
  } catch (error) {
    console.error("Twitter connection failed:", error)
    return false
  }
}
