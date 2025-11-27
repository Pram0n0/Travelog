import { useState } from 'react'
import './ProfileSettings.css'

function ProfileSettings({ user, onUpdate, onClose }) {
  const [displayName, setDisplayName] = useState(user.displayName || user.username)
  const [avatar, setAvatar] = useState(user.avatar || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result)
        setUploadingImage(false)
        setShowAvatarMenu(false)
      }
      reader.onerror = () => {
        alert('Failed to read image file')
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
      setUploadingImage(false)
    }
  }

  const handleUrlSubmit = () => {
    if (avatarUrl.trim()) {
      setAvatar(avatarUrl.trim())
      setAvatarUrl('')
      setShowAvatarMenu(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatar('')
    setShowAvatarMenu(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onUpdate(displayName, avatar)
      onClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>⚙️ Profile Settings</h3>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-preview">
            <div className="avatar-container" onClick={() => setShowAvatarMenu(!showAvatarMenu)}>
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Profile" 
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="profile-avatar-placeholder" 
                style={{ display: avatar ? 'none' : 'flex' }}
              >
                👤
              </div>
              <div className="avatar-overlay">
                <span>📷</span>
              </div>
            </div>

            {showAvatarMenu && (
              <div className="avatar-menu">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  id="avatar-upload-hidden"
                  style={{ display: 'none' }}
                  disabled={uploadingImage}
                />
                <button
                  type="button"
                  className="avatar-menu-item"
                  onClick={() => document.getElementById('avatar-upload-hidden').click()}
                  disabled={uploadingImage}
                >
                  📤 Upload photo
                </button>
                <button
                  type="button"
                  className="avatar-menu-item"
                  onClick={() => {
                    const url = prompt('Enter image URL:')
                    if (url) {
                      setAvatar(url.trim())
                      setShowAvatarMenu(false)
                    }
                  }}
                >
                  🔗 Add photo URL
                </button>
                {avatar && (
                  <button
                    type="button"
                    className="avatar-menu-item danger"
                    onClick={handleRemoveAvatar}
                  >
                    🗑️ Remove photo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Display Name:</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="disabled-input"
            />
            <p className="help-text">Username cannot be changed</p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileSettings
