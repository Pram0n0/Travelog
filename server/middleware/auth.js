/**
 * Authentication middleware for protected routes
 */

/**
 * Check if user is authenticated
 * Sends 401 response if not authenticated
 */
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ error: 'Not authenticated' })
}

/**
 * Check if user is a member of the specified group
 * Requires isAuthenticated middleware to run first
 * Attaches group to req.group for use in route handler
 */
export const isGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params
    const username = req.user.username
    
    // Import Group model here to avoid circular dependencies
    const { default: Group } = await import('../models/Group.js')
    
    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }
    
    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }
    
    // Attach group to request for use in handler
    req.group = group
    next()
  } catch (error) {
    console.error('Error checking group membership:', error)
    res.status(500).json({ error: 'Error checking group membership' })
  }
}
