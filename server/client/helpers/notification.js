export default async ({ title, body, icon }) => {
  try {
    const errData = {};

    if (!('Notification' in window)) {
      // check if the browser supports notifications
      errData.message = 'This browser does not support desktop notification';
      throw errData;
    }

    if (Notification.permission === 'granted') {
      // If permission is already granted, show the notification
      const notif = new Notification(title, { body, icon });

      notif.onerror = (error1) => {
        throw error1;
      };
    } else if (Notification.permission !== 'denied') {
      // If permission is not denied, request permission
      await Notification.requestPermission();
    }
  } catch (error0) {
    console.error(error0.message);
  }
};
