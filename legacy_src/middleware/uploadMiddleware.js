const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureUploadDirs = () => {
    const dirs = ['uploads/avatars', 'uploads/resumes', 'uploads/logos', 'uploads/covers'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureUploadDirs();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/general';
        if (file.fieldname === 'avatar') folder = 'uploads/avatars';
        if (file.fieldname === 'logo') folder = 'uploads/logos';
        if (file.fieldname === 'resume') folder = 'uploads/resumes';
        if (file.fieldname === 'coverImage') folder = 'uploads/covers';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    }
});

const fileFilterImages = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WEBP images allowed'), false);
    }
};

const fileFilterDocuments = (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX files allowed'), false);
    }
};

const uploadAvatar = multer({
    storage,
    fileFilter: fileFilterImages,
    limits: { fileSize: 2 * 1024 * 1024 }
}).single('avatar');

const uploadLogo = multer({
    storage,
    fileFilter: fileFilterImages,
    limits: { fileSize: 2 * 1024 * 1024 }
}).single('logo');

const uploadResume = multer({
    storage,
    fileFilter: fileFilterDocuments,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('resume');

const uploadCoverImage = multer({
    storage,
    fileFilter: fileFilterImages,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('coverImage');

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ success: false, message: 'File too large. Max 2MB for images, 5MB for documents.' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};

module.exports = {
    uploadAvatar,
    uploadLogo,
    uploadResume,
    uploadCoverImage,
    handleUploadError
};