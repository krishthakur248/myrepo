// Message Service - Handles all messaging API calls

class MessageService {
  // Send a message
  static async sendMessage(tripId, recipientId, messageText) {
    try {
      const response = await apiClient.post('/messages/send', {
        tripId,
        recipientId,
        messageText,
        messageType: 'text'
      });
      return response;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  // Get all messages for a trip
  static async getMessages(tripId) {
    try {
      const response = await apiClient.get(`/messages/trip/${tripId}`);
      return response;
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  // Get unread message count
  static async getUnreadCount(tripId) {
    try {
      const response = await apiClient.get(`/messages/unread/${tripId}`);
      return response;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  // Mark messages as read
  static async markAsRead(tripId) {
    try {
      const response = await apiClient.put(`/messages/mark-read/${tripId}`);
      return response;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }
}
