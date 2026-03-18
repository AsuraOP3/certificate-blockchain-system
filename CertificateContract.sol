// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateContract {
    address public owner;
    
    struct Certificate {
        bytes32 certificateHash;
        string studentName;
        string courseName;
        uint256 issueDate;
        bool isValid;
        address issuer;
    }
    
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bool) public authorizedIssuers;
    
    event CertificateIssued(bytes32 indexed certificateHash, string studentName, address indexed issuer);
    event CertificateRevoked(bytes32 indexed certificateHash);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner, "Not authorized to issue certificates");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }
    
    function addIssuer(address _issuer) public onlyOwner {
        authorizedIssuers[_issuer] = true;
    }
    
    function removeIssuer(address _issuer) public onlyOwner {
        authorizedIssuers[_issuer] = false;
    }
    
    function issueCertificate(
        string memory _studentName,
        string memory _courseName,
        bytes32 _certificateHash
    ) public onlyAuthorizedIssuer returns (bytes32) {
        require(certificates[_certificateHash].issueDate == 0, "Certificate already exists");
        
        certificates[_certificateHash] = Certificate({
            certificateHash: _certificateHash,
            studentName: _studentName,
            courseName: _courseName,
            issueDate: block.timestamp,
            isValid: true,
            issuer: msg.sender
        });
        
        emit CertificateIssued(_certificateHash, _studentName, msg.sender);
        return _certificateHash;
    }
    
    function revokeCertificate(bytes32 _certificateHash) public onlyAuthorizedIssuer {
        require(certificates[_certificateHash].issueDate != 0, "Certificate does not exist");
        require(certificates[_certificateHash].issuer == msg.sender || msg.sender == owner, "Not authorized to revoke this certificate");
        
        certificates[_certificateHash].isValid = false;
        emit CertificateRevoked(_certificateHash);
    }
    
    function verifyCertificate(bytes32 _certificateHash) public view returns (bool, string memory, string memory, uint256, bool, address) {
        Certificate memory cert = certificates[_certificateHash];
        if (cert.issueDate == 0) {
            return (false, "", "", 0, false, address(0));
        }
        return (true, cert.studentName, cert.courseName, cert.issueDate, cert.isValid, cert.issuer);
    }
    
    function getCertificateDetails(bytes32 _certificateHash) public view returns (string memory, string memory, uint256, bool, address) {
        Certificate memory cert = certificates[_certificateHash];
        require(cert.issueDate != 0, "Certificate does not exist");
        return (cert.studentName, cert.courseName, cert.issueDate, cert.isValid, cert.issuer);
    }
}