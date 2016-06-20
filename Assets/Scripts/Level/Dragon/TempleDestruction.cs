using UnityEngine;
using System.Collections;

public class TempleDestruction : MonoBehaviour {

    [SerializeField]
    private TempleBombDetection _bombDetection;

    [SerializeField]
    private BoxCollider2D _thisBoxCollider2D;

    private Rigidbody2D _thisRigidBody2D;

    void Awake()
    {
        _thisRigidBody2D = this.GetComponent<Rigidbody2D>();
        _bombDetection.OnBombExplosion += RandomExplosion;
    }

	void RandomExplosion()
    {
        if (_thisBoxCollider2D != null)
        _thisBoxCollider2D.isTrigger = true;
        _thisRigidBody2D.isKinematic = false;
        _thisRigidBody2D.velocity = new Vector2(Random.Range(-2, 2), Random.Range(-2, 5));
    }
}
