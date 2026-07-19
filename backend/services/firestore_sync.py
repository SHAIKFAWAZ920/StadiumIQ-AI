import logging
import os

db_fs = None
firestore_active = False

try:
    import firebase_admin
    from firebase_admin import firestore
    
    # Initialize connection to Firestore
    # Firebase Admin SDK is initialized in backend/api/auth.py or main.py
    # We retrieve the client instance here
    if firebase_admin._apps:
        db_fs = firestore.client()
        firestore_active = True
        logging.info("Firestore client successfully connected.")
except Exception as e:
    logging.warning(f"Firestore client could not be initialized: {e}. Real-time cloud sync is inactive.")

def sync_to_firestore(collection: str, doc_id: str, data: dict):
    """
    Syncs a document status update to Google Firestore in the cloud.
    Fails silently (logs warning) if Firestore is not connected/initialized.
    """
    if firestore_active and db_fs:
        try:
            # Set merge=True to prevent overwriting existing keys in document
            db_fs.collection(collection).document(str(doc_id)).set(data, merge=True)
        except Exception as e:
            logging.error(f"Firestore Sync Error (Collection: {collection}, Doc: {doc_id}): {e}")
    else:
        # Dry-run logging for local mock setups
        pass
