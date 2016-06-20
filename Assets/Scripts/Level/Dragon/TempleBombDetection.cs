using UnityEngine;
using System.Collections;

public class TempleBombDetection : MonoBehaviour {

    public delegate void TempleDestroyerEventHandler();
    public TempleDestroyerEventHandler OnBombExplosion;

    private int _pOne = 1;
    private int _pTwo = 2;
    private int _pThree = 3;
    private int _pFour = 4;

    bool _p1Dragon;
    bool _p2Dragon;
    bool _p3Dragon;
    bool _p4Dragon;

    public bool GetP1Dragon
    {
        get { return _p1Dragon; }
    }

    public bool GetP2Dragon
    {
        get { return _p2Dragon; }
    }

    public bool GetP3Dragon
    {
        get { return _p3Dragon; }
    }

    public bool GetP4Dragon
    {
        get { return _p4Dragon; }
    }

	void OnTriggerEnter2D(Collider2D bomb)
    {
        if (bomb.gameObject.CompareTag(GameTags.bullet))
        {
            if (bomb.gameObject.GetComponent<BombExplosion>() != null)
            {

                if (OnBombExplosion != null)
                    OnBombExplosion();

                if (bomb.gameObject.GetComponent<BulletNumber>().playernum == _pOne)
                {
                    _p1Dragon = true;
                    _p2Dragon = false;
                    _p3Dragon = false;
                    _p4Dragon = false;
                }

                else if (bomb.gameObject.GetComponent<BulletNumber>().playernum == _pTwo)
                {
                    _p2Dragon = true;
                    _p1Dragon = false;
                    _p3Dragon = false;
                    _p4Dragon = false;
                }

                else if (bomb.gameObject.GetComponent<BulletNumber>().playernum == _pThree)
                {
                    _p3Dragon = true;
                    _p1Dragon = false;
                    _p2Dragon = false;
                    _p4Dragon = false;
                }

                else if (bomb.gameObject.GetComponent<BulletNumber>().playernum == _pFour)
                {
                    _p4Dragon = true;
                    _p1Dragon = false;
                    _p2Dragon = false;
                    _p3Dragon = false;
                }
            }     
        }
    }
}
