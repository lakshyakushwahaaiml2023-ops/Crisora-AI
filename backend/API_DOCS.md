# Disaster Management System API Documentation

Base URL: `http://localhost:5000`

---

## 1. Authentication (`/api/auth`)

### Register User
* **Method**: `POST`
* **Path**: `/api/auth/register`
* **Required Role**: Public
* **Request Body**:
  ```json
  {
    "name": "Rajesh Sharma",
    "email": "rajesh.sharma@dmoffice.gov.in",
    "password": "securepassword123",
    "role": "citizen",
    "phone": "+919876543210",
    "location": {
      "type": "Point",
      "coordinates": [77.40, 23.26]
    },
    "district": "Bhopal",
    "state": "Madhya Pradesh"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6a2be3d308b77c9e8e78f8b2",
      "name": "Rajesh Sharma",
      "email": "rajesh.sharma@dmoffice.gov.in",
      "role": "citizen",
      "phone": "+919876543210",
      "location": {
        "type": "Point",
        "coordinates": [77.4, 23.26]
      },
      "district": "Bhopal",
      "state": "Madhya Pradesh",
      "isActive": true,
      "createdAt": "2026-06-12T16:30:30.123Z",
      "updatedAt": "2026-06-12T16:30:30.123Z"
    }
  }
  ```

### Login User
* **Method**: `POST`
* **Path**: `/api/auth/login`
* **Required Role**: Public (Rate-limited: max 5 requests/min)
* **Request Body**:
  ```json
  {
    "email": "rajesh.sharma@dmoffice.gov.in",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6a2be3d308b77c9e8e78f8b2",
      "name": "Rajesh Sharma",
      "email": "rajesh.sharma@dmoffice.gov.in",
      "role": "citizen"
    }
  }
  ```

### Get Current User Profile
* **Method**: `GET`
* **Path**: `/api/auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: Authenticated (Any role)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "6a2be3d308b77c9e8e78f8b2",
      "name": "Rajesh Sharma",
      "email": "rajesh.sharma@dmoffice.gov.in",
      "role": "citizen"
    }
  }
  ```

---

## 2. Regions (`/api/regions`)

### List Regions
* **Method**: `GET`
* **Path**: `/api/regions`
* **Required Role**: Public
* **Query Params**: `?district=Bhopal&state=Madhya+Pradesh&riskLevel=yellow&page=1&limit=20`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "total": 1,
    "page": 1,
    "pages": 1,
    "data": [
      {
        "_id": "6a2bea29cf2a57ea2004e7d0",
        "name": "Bhopal Sector 1",
        "district": "Bhopal",
        "state": "Madhya Pradesh",
        "boundary": {
          "type": "Polygon",
          "coordinates": [[[77.38, 23.23], [77.48, 23.23], ...]]
        },
        "centroid": {
          "type": "Point",
          "coordinates": [77.42, 23.27]
        },
        "population": 125000,
        "riskScore": 20,
        "riskLevel": "green",
        "lastUpdated": "2026-06-12T16:34:25.123Z"
      }
    ]
  }
  ```

### Get Region Detail
* **Method**: `GET`
* **Path**: `/api/regions/:id`
* **Required Role**: Public
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "6a2bea29cf2a57ea2004e7d0",
      "name": "Bhopal Sector 1",
      "district": "Bhopal",
      "state": "Madhya Pradesh",
      "boundary": { "type": "Polygon", "coordinates": [...] },
      "centroid": { "type": "Point", "coordinates": [77.42, 23.27] },
      "population": 125000,
      "riskScore": 20,
      "riskLevel": "green",
      "resources": [...],
      "evacuationRoutes": [...],
      "historicalDisasters": []
    }
  }
  ```

### Create Region
* **Method**: `POST`
* **Path**: `/api/regions`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`
* **Request Body**:
  ```json
  {
    "name": "Bhopal Sector 1",
    "district": "Bhopal",
    "state": "Madhya Pradesh",
    "boundary": {
      "type": "Polygon",
      "coordinates": [[[77.38, 23.23], [77.48, 23.23], [77.48, 23.32], [77.38, 23.32], [77.38, 23.23]]]
    },
    "centroid": {
      "type": "Point",
      "coordinates": [77.42, 23.27]
    },
    "population": 125000,
    "riskScore": 20,
    "riskLevel": "green"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "6a2bea29cf2a57ea2004e7d0",
      "name": "Bhopal Sector 1",
      "district": "Bhopal",
      "state": "Madhya Pradesh",
      "boundary": { "type": "Polygon", "coordinates": [...] },
      "centroid": { "type": "Point", "coordinates": [77.42, 23.27] }
    }
  }
  ```

### Update Risk Status
* **Method**: `PUT`
* **Path**: `/api/regions/:id/risk`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`, `district_authority`, `collector`
* **Request Body**:
  ```json
  {
    "riskScore": 85,
    "riskLevel": "red"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Risk level updated successfully",
    "data": {
      "_id": "6a2bea29cf2a57ea2004e7d0",
      "name": "Bhopal Sector 1",
      "district": "Bhopal",
      "riskScore": 85,
      "riskLevel": "red",
      "lastUpdated": "2026-06-12T21:40:00.123Z"
    }
  }
  ```

### Get Evacuation Routes
* **Method**: `GET`
* **Path**: `/api/regions/:id/evacuation-routes`
* **Required Role**: Public
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "region": "Bhopal Sector 1",
    "district": "Bhopal",
    "total": 1,
    "evacuationRoutes": [
      {
        "_id": "6a2bea29cf2a57ea2004e7d1",
        "name": "Bhopal Main Evacuation Path",
        "path": {
          "type": "LineString",
          "coordinates": [[77.401, 23.262], [77.394, 23.261], ...]
        },
        "capacity": 2500,
        "status": "active"
      }
    ]
  }
  ```

### Add Evacuation Routes
* **Method**: `POST`
* **Path**: `/api/regions/:id/evacuation-routes`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`, `district_authority`, `collector`
* **Request Body (GeoJSON FeatureCollection or standard JSON)**:
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "name": "Alternative Route East",
          "capacity": 1500
        },
        "geometry": {
          "type": "LineString",
          "coordinates": [[77.40, 23.26], [77.41, 23.27]]
        }
      }
    ]
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Evacuation routes added successfully",
    "addedRoutes": [
      {
        "_id": "6a2bea29cf2a57ea2004e7d2",
        "name": "Alternative Route East",
        "path": {
          "type": "LineString",
          "coordinates": [[77.40, 23.26], [77.41, 23.27]]
        },
        "capacity": 1500,
        "status": "active"
      }
    ],
    "data": [...]
  }
  ```

---

## 3. SOS Distress Alerts (`/api/sos`)

### Create SOS Alert
* **Method**: `POST`
* **Path**: `/api/sos`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `citizen`
* **Request Body**:
  ```json
  {
    "location": {
      "type": "Point",
      "coordinates": [77.401, 23.261]
    },
    "type": "trapped",
    "message": "Water rising rapidly, trapped on 2nd floor."
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "SOS Alert created successfully",
    "data": {
      "_id": "6a2c29c84010a0916253a7a1",
      "userId": {
        "_id": "6a2c1f5608b77c9e8e78f8b1",
        "name": "Bhopal Citizen"
      },
      "location": { "type": "Point", "coordinates": [77.401, 23.261] },
      "type": "trapped",
      "status": "active",
      "regionId": {
        "_id": "6a2c29c84010a0916253a7a0",
        "name": "Bhopal Central Safety Zone"
      }
    }
  }
  ```

### List Active SOS Alerts
* **Method**: `GET`
* **Path**: `/api/sos`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`, `district_authority`, `collector`
* **Query Params (NDMA/State only)**: `?district=Bhopal` (Collectors/District Auth automatically restricted to their own district)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "_id": "6a2c29c84010a0916253a7a1",
        "userId": { "_id": "6a2c1f5608b77c9e8e78f8b1", "name": "Bhopal Citizen" },
        "location": { "type": "Point", "coordinates": [77.401, 23.261] },
        "type": "trapped",
        "status": "active",
        "regionId": { "_id": "6a2c29c84010a0916253a7a0", "name": "Bhopal Central Safety Zone" }
      }
    ]
  }
  ```

### Acknowledge Alert
* **Method**: `PUT`
* **Path**: `/api/sos/:id/acknowledge`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`, `district_authority`, `collector`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "SOS Alert acknowledged successfully",
    "data": {
      "_id": "6a2c29c84010a0916253a7a1",
      "status": "acknowledged",
      "assignedTo": {
        "_id": "6a2c1f8f08b77c9e8e78f8b2",
        "name": "Bhopal Collector",
        "role": "collector"
      }
    }
  }
  ```

### Resolve Alert
* **Method**: `PUT`
* **Path**: `/api/sos/:id/resolve`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`, `state_authority`, `district_authority`, `collector`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "SOS Alert resolved successfully",
    "data": {
      "_id": "6a2c29c84010a0916253a7a1",
      "status": "resolved"
    }
  }
  ```

---

## 4. AI Inquiries (`/api/ai`)

### Stream AI Chat
* **Method**: `POST`
* **Path**: `/api/ai/chat`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: Authenticated (Any role)
* **Request Body**:
  ```json
  {
    "regionId": "6a2c2a9aec761da1d3853cbe",
    "message": "What is the immediate action plan?"
  }
  ```
* **Success Response (200 OK - Stream)**:
  * Content-Type: `text/event-stream`
  * Stream delivers text tokens directly in chunk format (e.g. `SOP Advice: Evacuate low-lying regions...`).

---

## 5. Simulation Lab (`/api/simulation`)

### List Historical Disasters
* **Method**: `GET`
* **Path**: `/api/simulation/events`
* **Required Role**: Public
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 5,
    "data": [
      {
        "_id": "6a2c2e63639cf51b527cd347",
        "name": "2013 Kedarnath Floods",
        "type": "flood",
        "severity": 5,
        "status": "resolved",
        "startTime": "2013-06-16T07:00:00.000Z",
        "endTime": "2013-06-17T20:00:00.000Z",
        "affectedPopulation": 50000,
        "casualties": 5700,
        "regionId": {
          "_id": "6a2c2e63639cf51b527cd342",
          "name": "Kedarnath Valley",
          "district": "Rudraprayag"
        }
      }
    ]
  }
  ```

### Replay Event
* **Method**: `POST`
* **Path**: `/api/simulation/replay/:eventId`
* **Required Role**: Public
* **Request Body**:
  ```json
  {
    "offsetHours": 0
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "event": "2013 Kedarnath Floods",
    "region": {
      "id": "6a2c2e63639cf51b527cd342",
      "name": "Kedarnath Valley",
      "district": "Rudraprayag",
      "state": "Uttarakhand"
    },
    "simulationSettings": {
      "eventStartTime": "2013-06-16T07:00:00.000Z",
      "offsetHours": 0,
      "targetSimulationTime": "2013-06-16T07:00:00.000Z",
      "readingsCount": 5
    },
    "results": {
      "riskScore": 85,
      "riskLevel": "red",
      "recommendedActions": "Critical emergency. Order immediate evacuation along designated paths and mobilize medical centers."
    }
  }
  ```

---

## 6. Admin Panel (`/api/admin`)

### Jobs Execution Monitor
* **Method**: `GET`
* **Path**: `/api/admin/jobs-status`
* **Headers**: `Authorization: Bearer <token>`
* **Required Role**: `ndma`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "weatherJob": {
        "running": false,
        "lastRun": "2026-06-12T15:38:46.523Z",
        "status": "success"
      },
      "riverGaugeJob": {
        "running": false,
        "lastRun": "2026-06-12T15:38:46.523Z",
        "status": "success"
      },
      "citizenReportJob": {
        "running": false,
        "lastRun": "2026-06-12T15:38:46.523Z",
        "status": "success"
      }
    }
  }
  ```
