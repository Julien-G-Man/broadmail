import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    dev = os.environ.get("APP_ENV", "development") == "development"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=dev,
    )