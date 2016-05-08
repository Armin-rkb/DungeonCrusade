using UnityEngine;
using System.Collections;

public class FXManager : MonoBehaviour {

    [SerializeField]
    private bool _playAtStart;

    [SerializeField]
    private GameObject _singleFXObj;

    [SerializeField]
    private GameObject[] _FXObj;

    private Animation _animatorFX;

    [SerializeField]
    private int _customFXPlay;

    /*
     * FX INDEX
     * 0 = Smoke 
     * 
     */

	void Start () 
    {
        if (_playAtStart)
            Instantiate(_FXObj[_customFXPlay], transform.position, Quaternion.identity);
	}
	
	public void PlayFX(int fx)
    {
        Instantiate(_FXObj[fx], transform.position, Quaternion.identity);
        StartCoroutine(DestroyFX(fx));
    }

    private IEnumerator DestroyFX(int fx)
    {
        yield return new WaitForSeconds(3);
        Destroy(_FXObj[fx].gameObject);
    }
}
