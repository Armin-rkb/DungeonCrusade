using UnityEngine;
using System.Collections;

public class CameraShakeListener : MonoBehaviour {

    [SerializeField] CameraShake _cameraShake;

	void Awake()
    {
        HealthPlayer.OnPlayerHit += ShakeCamera;
    }
	
    void ShakeCamera(HealthPlayer player)
    {
        _cameraShake.Shake(0.25f);
    }
}
