using UnityEngine;
using System.Collections;

public class TileExplosion : MonoBehaviour {

    private FXManager _fxManager;

    void Start()
    {
        _fxManager = this.GetComponent<FXManager>();
    }

	void OnCollisionEnter2D(Collision2D coll)
    {

        print(coll.gameObject);
        if (coll.gameObject.name == "NewExplosion(Clone)")
        {

            SoundManager.PlayAudioClip(7);
            _fxManager.PlayFX(0, transform.position);
            Destroy(this.gameObject);
           
        }
    }
}
