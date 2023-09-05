import { useState, useEffect } from "react";
import axios from "axios";
import { Row, Form, Button, Card, ListGroup, Col } from "react-bootstrap";
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlM2Q2ZGQ4Ni00NWZhLTQ2NzctYWY3ZS04NDM5ODE5ZDZiYjQiLCJlbWFpbCI6InJhZ2Vzb2x1dGlvbnMxN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNjg0YmNlMTY2NTEwYTA1ZmI2MzEiLCJzY29wZWRLZXlTZWNyZXQiOiIwYjFiZjNhMGQ3MWU1MjgwN2M5OGE2MGYyODE0MDVjZTZiOWU1MTJmNzVlY2E0ZWZmZWFhOTNhNmQzZDgyZDQ1IiwiaWF0IjoxNjkzOTA3NDc0fQ.y2xpU9m_CgkHsQXANcP5mNFRx9Yho82tdDdYckl1tqY";
const App = ({ contract }) => {
  const [profile, setProfile] = useState("");
  const [nfts, setNfts] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const loadMyNFTs = async () => {
    // Get users nft ids
    const results = await contract.getMyNfts();
    // Fetch metadata of each nft and add that to nft object.
    let nfts = await Promise.all(
      results.map(async (i) => {
        // get uri url of nft
        const uri = await contract.tokenURI(i);
        // fetch nft metadata
        const response = await fetch(uri);
        const metadata = await response.json();
        return {
          id: i,
          username: metadata.username,
          avatar: metadata.avatar,
        };
      })
    );
    setNfts(nfts);
    getProfile(nfts);
  };
  const getProfile = async (nfts) => {
    const address = await contract.signer.getAddress();
    const id = await contract.profiles(address);
    const profile = nfts.find((i) => i.id.toString() === id.toString());
    setProfile(profile);
    setLoading(false);
  };
  const uploadToIPFS = async (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    if (typeof file !== "undefined") {
      try {
        const formData = new FormData();
        console.log(file);
        formData.append("file", file);
        const pinataMetadata = JSON.stringify({
          name: "File name",
        });
        formData.append("pinataMetadata", pinataMetadata);

        const pinataOptions = JSON.stringify({
          cidVersion: 0,
        });
        formData.append("pinataOptions", pinataOptions);
        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            Authorization: `Bearer ${JWT}`,
          },
        });
        const image = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
        console.log(res);
        setAvatar(image);
      } catch (error) {
        console.log("ipfs image upload error: ", error);
      }
    }
  };
  const mintProfile = async (event) => {
    if (!avatar || !username) return;

    try {
      const data = JSON.stringify({
        pinataContent: {
          username,
          avatar,
        },
      });

      const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${JWT}`,
        },
      });
      console.log(res);
      await (await contract.mint(`https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`)).wait();
      loadMyNFTs();
    } catch (error) {
      window.alert("ipfs uri upload error: ", error);
    }
  };

  const switchProfile = async (nft) => {
    setLoading(true);
    await (await contract.setProfile(nft.id)).wait();
    getProfile(nfts);
  };
  useEffect(() => {
    if (!nfts) {
      loadMyNFTs();
    }
  });
  if (loading)
    return (
      <div className="text-center">
        <main style={{ padding: "1rem 0" }}>
          <h2>Loading...</h2>
        </main>
      </div>
    );
  return (
    <div className="mt-4 text-center">
      {profile ? (
        <div className="mb-3">
          <h3 className="mb-3">{profile.username}</h3>
          <img className="mb-3" style={{ width: "400px" }} src={profile.avatar} />
        </div>
      ) : (
        <h4 className="mb-4">No NFT profile, please create one...</h4>
      )}

      <div className="row">
        <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: "1000px" }}>
          <div className="content mx-auto">
            <Row className="g-4">
              <Form.Control type="file" required name="file" onChange={uploadToIPFS} />
              <Form.Control onChange={(e) => setUsername(e.target.value)} size="lg" required type="text" placeholder="Username" />
              <div className="d-grid px-0">
                <Button onClick={mintProfile} variant="primary" size="lg">
                  Mint NFT Profile
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
      <div className="px-5 container">
        <Row xs={1} md={2} lg={4} className="g-4 py-5">
          {nfts.map((nft, idx) => {
            if (nft.id === profile.id) return;
            return (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={nft.avatar} />
                  <Card.Body color="secondary">
                    <Card.Title>{nft.username}</Card.Title>
                  </Card.Body>
                  <Card.Footer>
                    <div className="d-grid">
                      <Button onClick={() => switchProfile(nft)} variant="primary" size="lg">
                        Set as Profile
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

export default App;
