const Utilities = {
    base64Encode: jest.fn((val) => val),
    base64Decode: jest.fn((val) => val),
    newBlob: jest.fn((decodedData) => ({ getDataAsString: () => decodedData })),
};

module.exports = Utilities;
