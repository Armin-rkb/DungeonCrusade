using UnityEngine;
using System.Collections;

public class CameraShake : MonoBehaviour {

    //Floats
    [SerializeField] private float _shakePower = 0.05f;

    public float SetShakePower
    {
        get { return _shakePower; }
        set { _shakePower = value; }
    }
    //Floats

    //Bool
    private bool _isShaking;
	//Bool

    //Camera
    private Camera _gameCamera;
    //Camera

    private Vector3 _startPos;


    void Start ()
    {
        _gameCamera = this.GetComponent<Camera>();
        _startPos = this.transform.position;
    }

	void Update () 
    {
        ShakeCamera();
	}

    private void ShakeCamera()
    {
        if (_isShaking)
        {
            _gameCamera.orthographicSize = 6.95f;
            transform.localPosition = transform.localPosition + Random.insideUnitSphere * _shakePower;
        }
        else
            _gameCamera.orthographicSize = 7f;
    }


    public void Shake(float duration)
    {
        _isShaking = true;
        CancelInvoke();
        Invoke("StopShaking", duration);
    }
 

    public void StopShaking()
    {
        _isShaking = false;
        this.transform.position = _startPos;
    }
}
